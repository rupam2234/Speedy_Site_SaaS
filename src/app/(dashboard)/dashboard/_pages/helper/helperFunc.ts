// import { google } from "googleapis";

export class PageManagementHelper {
  constructor() {} // default constructor

  // gives authentication
  public async authenticate(): Promise<string> {
    // const auth2Client = new google.auth.OAuth2({
    //   clientId: process.env.Google_Oauth2_Client_id!,
    //   clientSecret: process.env.Google_Oauth2_Client_secret!,
    //   redirectUri: "http://localhost:3000/oauth2callback",
    // });

    // const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

    // const authUrl = auth2Client.generateAuthUrl({
    //   access_type: "offline",
    //   scope: SCOPES,
    // });
    // if (authUrl) {
    //   return authUrl;
    // }
    // console.error(authUrl);
    return "";
  }

  // to aquire token from gsc
  // public async getToken(code: string): Promise<any> {
  //   const auth2Client = new google.auth.OAuth2({
  //     clientId: process.env.Google_Oauth2_Client_id!,
  //     clientSecret: process.env.Google_Oauth2_Client_secret!,
  //     redirectUri: "http://localhost:3000/oauth2callback",
  //   });

  //   try {
  //     const tokens = await auth2Client.getToken(code);
  //     return tokens;
  //   } catch (error) {
  //     console.log("unable to fetch token!", error);
  //     return "";
  //   }
  // }
}
