import { TokenType } from "@prisma/client";

const SITE_KEY = "6LcFu9YUAAAAAO3sykMNOrP6sFv6b4ki880AbDBh";
const SITE_URL_TICKETS = "https://widget.weezevent.com/ticket/resale_tickets_bf2025";
const SITE_URL_SERVICES = "https://widget.weezevent.com/ticket/resale_services_bf2025";

export default async function capsolver(tokenType: TokenType) {
  try {
    const { taskId } = await fetch("https://api.capsolver.com/createTask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientKey: process.env.CAPSOLVER_API_KEY,
        task: {
          type: "ReCaptchaV2TaskProxyLess",
          websiteKey: SITE_KEY,
          websiteURL: tokenType === TokenType.AUTH_TICKETS ? SITE_URL_TICKETS : SITE_URL_SERVICES,
        },
      }),
    }).then((res) => res.json());
    console.log("🚀 ~ capsolver ~ taskId:", taskId, tokenType)

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay for 1 second

      const resp = await fetch("https://api.capsolver.com/getTaskResult", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientKey: process.env.CAPSOLVER_API_KEY,
          taskId,
        }),
      }).then((res) => res.json());
      const status = resp.status;

      if (status === "ready") {
        return resp.solution.gRecaptchaResponse;
      }
      if (status === "failed" || resp.errorId) {
        console.error("Solve failed! response:", resp);
        return await capsolver(tokenType);
        // return;
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
