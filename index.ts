import "dotenv/config";

import { Telegraf, Markup } from "telegraf";
import { TicketType } from "@prisma/client";

import { getAvailability } from "./weezevent";
import { delay } from "./utils";
import prisma from "./prisma";

const BOT_TOKEN = process.env.BOT_TOKEN;

const bot = new Telegraf(BOT_TOKEN as string);

async function main() {
  bot.start(async (ctx) => {
    const chatId = ctx.chat.id + "";
    await prisma.alert.upsert({
      where: { id: ctx.chat.id + "|" + TicketType.ENTRANCE },
      update: {
        ticketType: TicketType.ENTRANCE,
        chatId,
        enabled: true,
      },
      create: {
        id: ctx.chat.id + "|" + TicketType.ENTRANCE,
        ticketType: TicketType.ENTRANCE,
        chatId,
        enabled: true,
      },
    });

    await ctx.reply(
      "Welcome!\nI will send you a notification every time a ticket becomes available."
    );
    await sendHelp(ctx);
  });

  bot.help(async (ctx) => {
    await sendHelp(ctx);
  });

  const sendHelp = async (ctx: any) => {
    const chatId = ctx.chat.id + "";
    const userAlerts = await prisma.alert.findMany({
      where: { chatId },
    });

    const entry = userAlerts.find(
      (alert) => alert.ticketType === TicketType.ENTRANCE
    )?.enabled;
    const bellTent3P = userAlerts.find(
      (alert) => alert.ticketType === TicketType.BELL_TENT_3P
    )?.enabled;
    const bellTent4P = userAlerts.find(
      (alert) => alert.ticketType === TicketType.BELL_TENT_4P
    )?.enabled;
    const domoTent6P = userAlerts.find(
      (alert) => alert.ticketType === TicketType.DOMO_TENT_6P
    )?.enabled;
    const singlePlace = userAlerts.find(
      (alert) => alert.ticketType === TicketType.SINGLE_PLACE
    )?.enabled;
    const starTent2P = userAlerts.find(
      (alert) => alert.ticketType === TicketType.STAR_TENT_2P
    )?.enabled;
    const starTent5P = userAlerts.find(
      (alert) => alert.ticketType === TicketType.STAR_TENT_5P
    )?.enabled;
    const tipi2P = userAlerts.find(
      (alert) => alert.ticketType === TicketType.TIPI_2P
    )?.enabled;
    const tipi6P = userAlerts.find(
      (alert) => alert.ticketType === TicketType.TIPI_6P
    )?.enabled;

    await ctx.reply(
      "You have the following notifications configured:\n" +
        `\n*BOOM FESTIVAL*\n` +
        `1. 🎟️ Entry Ticket: ${entry ? "✅" : "❌"}\n` +
        `\n*LIZARD CAMP*\n` +
        `2. 🏕️ Bell Tent 3P: ${bellTent3P ? "✅" : "❌"}\n` +
        `3. 🏕️ Bell Tent 4P: ${bellTent4P ? "✅" : "❌"}\n` +
        `4. 🏕️ Domo Tent 6P: ${domoTent6P ? "✅" : "❌"}\n` +
        `\n*WANBLI TIPI CAMP*\n` +
        `5. 🛖 Single Place (Shared Tent): ${singlePlace ? "✅" : "❌"}\n` +
        `6. 🛖 Star Tent 2P: ${starTent2P ? "✅" : "❌"}\n` +
        `7. 🛖 Star Tent 5P: ${starTent5P ? "✅" : "❌"}\n` +
        `8. 🛖 Tipi 2P: ${tipi2P ? "✅" : "❌"}\n` +
        `9. 🛖 Tipi 6P: ${tipi6P ? "✅" : "❌"}\n\n` +
        "Respond with the corresponding number to toggle the notification.\n" +
        "Eg. to enable/disable the entry ticket notifications, respond with '1'.",
      {
        parse_mode: "Markdown",
        ...Markup.keyboard(["1", "2", "3", "4", "5", "6", "7", "8", "9"], {
          wrap: (btn, index, currentRow) => currentRow.length >= 3,
        }),
      }
    );
  };

  const optionMap = {
    "1": TicketType.ENTRANCE,
    "2": TicketType.BELL_TENT_3P,
    "3": TicketType.BELL_TENT_4P,
    "4": TicketType.DOMO_TENT_6P,
    "5": TicketType.SINGLE_PLACE,
    "6": TicketType.STAR_TENT_2P,
    "7": TicketType.STAR_TENT_5P,
    "8": TicketType.TIPI_2P,
    "9": TicketType.TIPI_6P,
  };

  bot.hears(["1", "2", "3", "4", "5", "6", "7", "8", "9"], async (ctx) => {
    const chatId = ctx.chat.id + "";
    const { text } = ctx.message as { text: keyof typeof optionMap };

    const ticketType = optionMap[text];
    const alert = await prisma.alert.findUnique({
      where: {
        id: chatId + "|" + ticketType,
      },
    });

    if (!alert) {
      await prisma.alert.create({
        data: {
          id: chatId + "|" + ticketType,
          ticketType: ticketType,
          chatId,
          enabled: true,
        },
      });
    } else {
      await prisma.alert.update({
        where: {
          id: chatId + "|" + ticketType,
        },
        data: {
          enabled: !alert.enabled,
        },
      });
    }

    await sendHelp(ctx);
  });

  bot.catch((err) => {
    console.log(err);
  });

  bot.launch();

  // Enable graceful stop
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));

  // main loop
  while (true) {
    // 500ms, don't want to spam the API, total loop time is ~1s - i think.
    await delay(500);

    // Check how many tickets are available for each type
    const availability = await getAvailability();

    // Iterate all ticket types
    for (let index = 0; index < Object.keys(TicketType).length; index++) {
      const ticketType = Object.keys(TicketType)[index] as TicketType;

      const inventory_ = await prisma.inventory.findUnique({
        where: { ticketType },
      });
      const inventory = inventory_?.count || 0;
      const available = availability[ticketType] || 0;

      const getHeadline = (ticketType: TicketType) => {
        switch (ticketType) {
          case TicketType.ENTRANCE:
            return "🎟️ Entry Ticket";
          case TicketType.BELL_TENT_3P:
            return "🏕️ Bell Tent 3P";
          case TicketType.BELL_TENT_4P:
            return "🏕️ Bell Tent 4P";
          case TicketType.DOMO_TENT_6P:
            return "🏕️ Domo Tent 6P";
          case TicketType.SINGLE_PLACE:
            return "🛖 Single Place (Shared Tent)";
          case TicketType.STAR_TENT_2P:
            return "🛖 Star Tent 2P";
          case TicketType.STAR_TENT_5P:
            return "🛖 Star Tent 5P";
          case TicketType.TIPI_2P:
            return "🛖 Tipi 2P";
          case TicketType.TIPI_6P:
            return "🛖 Tipi 6P";
        }
      };

      // Notify if any new tickets are available
      if (available > inventory) {
        const diff = available - inventory;
        const msg = `${getHeadline(
          ticketType
        )}:\n${diff} New tickets available!`;
        const alerts = await prisma.alert.findMany({
          where: { ticketType, enabled: true },
        });
        const alertPromises = alerts.map(async (alert) => {
          try {
            await bot.telegram.sendMessage(alert.chatId, msg);
          } catch (e) {
            console.log(e);
          }
        });
        /**
         * TODO: profile these, might be slowing things down.
         * Might be better to batch these up and send them all at once.
         */
        await Promise.all(alertPromises);
      }

      /**
       * TODO: profile these, might be slowing things down.
       * Might be better to batch these up and send them all at once.
       */
      if (available > 0) {
        await prisma.inventory.upsert({
          where: { ticketType },
          update: { count: available, updatedAt: new Date() },
          create: { ticketType, count: available, updatedAt: new Date() },
        });
      } else if (inventory !== 0 && available === 0) {
        await prisma.inventory.upsert({
          where: { ticketType },
          update: { count: available, updatedAt: new Date() },
          create: { ticketType, count: 0, updatedAt: new Date() },
        });
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
