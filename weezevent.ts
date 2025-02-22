import { TicketType, TokenType } from "@prisma/client";
import capsolver from "./capsolver.js";
import prisma from "./prisma";
import { isExpired } from "./utils";

export const getAuthToken = async (
  tokenType: TokenType,
  recaptcha_token: string
) => {
  const slug =
    tokenType === TokenType.AUTH_TICKETS
      ? "resale_tickets_bf2025"
      : "resale_services_bf2025";
  const bearerToken = await fetch(
    `https://api.weezevent.com/ticket/widgets/${slug}?`
  )
    .then((res) => res.json())
    .then((res) => res.first_step.token);

  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  myHeaders.append("accept-language", "fr-FR");
  myHeaders.append("authorization", `Bearer ${bearerToken}`);
  myHeaders.append("cache-control", "no-cache");
  myHeaders.append("content-type", "application/json; charset=utf-8");
  myHeaders.append("origin", "https://widget.weezevent.com");
  myHeaders.append("pragma", "no-cache");
  myHeaders.append("priority", "u=1, i");
  myHeaders.append("referer", "https://widget.weezevent.com/");
  myHeaders.append(
    "sec-ch-ua",
    '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"'
  );
  myHeaders.append("sec-ch-ua-mobile", "?0");
  myHeaders.append("sec-ch-ua-platform", '"macOS"');
  myHeaders.append("sec-fetch-dest", "empty");
  myHeaders.append("sec-fetch-mode", "cors");
  myHeaders.append("sec-fetch-site", "same-site");
  myHeaders.append(
    "user-agent",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
  );

  const payload = { recaptcha_token };

  const { token } = await fetch(
    `https://api.weezevent.com/ticket/widgets/${slug}/steps/2-recaptcha?`,
    {
      method: "POST",
      headers: myHeaders,
      body: JSON.stringify(payload),
      redirect: "follow",
    }
  ).then((response) => response.json());
  return token;
};

export const refreshToken = async (tokenType: TokenType) => {
  const recaptcha_token = await capsolver(tokenType);
  const authToken = await getAuthToken(tokenType, recaptcha_token);
  console.log(tokenType, "Token successfully refreshed!");
  const token = await prisma.tokens.upsert({
    where: { tokenType },
    update: { token: authToken },
    create: { token: authToken, tokenType },
  });
  return token;
};

export const getAvailability = async () => {
  let tokenTickets = await prisma.tokens.findUnique({
    where: { tokenType: TokenType.AUTH_TICKETS },
  });
  let tokenServices = await prisma.tokens.findUnique({
    where: { tokenType: TokenType.AUTH_SERVICES },
  });

  if (isExpired(tokenTickets)) {
    tokenTickets = await refreshToken(TokenType.AUTH_TICKETS);
  }
  if (isExpired(tokenServices)) {
    tokenServices = await refreshToken(TokenType.AUTH_SERVICES);
  }


  const ticketsPromise = fetch(
    `https://api.weezevent.com/ticket/widgets/resale_tickets_bf2025?`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${tokenTickets?.token}`,
      },
    }
  ).then((response) => response.json());
  const servicesPromise = fetch(
    `https://api.weezevent.com/ticket/widgets/resale_services_bf2025?`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${tokenServices?.token}`,
      },
    }
  ).then((response) => response.json());

  const [tickets, services] = await Promise.all([
    ticketsPromise,
    servicesPromise,
  ]);

  const getQuantityAvailable = (
    result: any,
    groupId: number,
    rateId: number
  ) => {
    // console.log("🚀 ~ getAvailability ~ result:", result, groupId, rateId)
    return result.first_step.data[
      "ticket-market-rates"
    ].rates_with_group[0].children
      .find((group: any) => group.id === groupId)
      .rates.find((rate: any) => rate.id === rateId).quantity_available;
  };

  // Group IDs
  const BOOM_FESTIVAL = 1745117;
  const LIZARD_CAMP = 1744467;
  const WANBLI_TIPI_CAMP = 1744462;

  // Rate IDs
  const ENTRANCE = 4472306;
  const BELL_TENT_3P = 4482170;
  const BELL_TENT_4P = 4482171;
  const DOMO_TENT_6P = 4482172;
  const SINGLE_PLACE = 4482125;
  const STAR_TENT_2P = 4482175;
  const STAR_TENT_5P = 4482127;
  const TIPI_2P = 4482126;
  const TIPI_6P = 4482130;

  const availability: { [key in TicketType]?: number } = {};

  // Boom Festival
  availability[TicketType.ENTRANCE] = getQuantityAvailable(
    tickets,
    BOOM_FESTIVAL,
    ENTRANCE
  );
  // Lizard Camp
  availability[TicketType.BELL_TENT_3P] = getQuantityAvailable(
    services,
    LIZARD_CAMP,
    BELL_TENT_3P
  );
  availability[TicketType.BELL_TENT_4P] = getQuantityAvailable(
    services,
    LIZARD_CAMP,
    BELL_TENT_4P
  );
  availability[TicketType.DOMO_TENT_6P] = getQuantityAvailable(
    services,
    LIZARD_CAMP,
    DOMO_TENT_6P
  );
  // Wanbli Tipi Camp
  availability[TicketType.SINGLE_PLACE] = getQuantityAvailable(
    services,
    WANBLI_TIPI_CAMP,
    SINGLE_PLACE
  );
  availability[TicketType.STAR_TENT_2P] = getQuantityAvailable(
    services,
    WANBLI_TIPI_CAMP,
    STAR_TENT_2P
  );
  availability[TicketType.STAR_TENT_5P] = getQuantityAvailable(
    services,
    WANBLI_TIPI_CAMP,
    STAR_TENT_5P
  );
  availability[TicketType.TIPI_2P] = getQuantityAvailable(
    services,
    WANBLI_TIPI_CAMP,
    TIPI_2P
  );
  availability[TicketType.TIPI_6P] = getQuantityAvailable(
    services,
    WANBLI_TIPI_CAMP,
    TIPI_6P
  );
  return availability;
};
