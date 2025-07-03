import { TokenProps } from "@/app/api/orders/updateOrder/route";
import { google } from "googleapis";

export class PageManagementHelper {
  constructor() {} // default constructor

  // gives authentication
  public async authenticate(): Promise<string> {
    const auth2Client = new google.auth.OAuth2({
      clientId: process.env.Google_Oauth2_Client_id!,
      clientSecret: process.env.Google_Oauth2_Client_secret!,
      redirectUri: "http://localhost:3000/oauth2callback",
    });

    const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

    const authUrl = auth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    if (authUrl) {
      return authUrl;
    }
    console.error(authUrl);
    return "";
  }

  // to aquire token from gsc
  public async getToken(code: string): Promise<any> {
    const auth2Client = new google.auth.OAuth2({
      clientId: process.env.Google_Oauth2_Client_id!,
      clientSecret: process.env.Google_Oauth2_Client_secret!,
      redirectUri: "http://localhost:3000/oauth2callback",
    });

    try {
      const tokens = await auth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.log("unable to fetch token!", error);
      return "";
    }
  }

  // keep the token on db
  public async UpdateToken(token: string, website_name: string) {

    const userEmail = localStorage.getItem("userEmail");

    if (!token || !website_name) {
      console.error("Missing website or token");
      return;
    }

    const body: TokenProps = { token: token, userEmail: userEmail ?? "" };

    try {
      const response = await fetch("/api/orders/updateOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      if (!response.ok) {
        console.error(response.statusText);
      }

    } catch (error) {
      console.error(error);
    }
  }
}
