import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private oauth2Client;

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI', 'http://localhost:3000/api/sessions/auth/google/callback');

    if (clientId && clientSecret) {
      this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    } else {
      this.logger.warn('Google Client ID or Secret is not configured. Google Calendar integration will not work.');
    }
  }

  generateAuthUrl(userId: string): string {
    if (!this.oauth2Client) throw new Error('Google OAuth is not configured');

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force to get refresh token
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      state: userId, // Pass userId through state to link the callback
    });
  }

  async getRefreshToken(code: string): Promise<string> {
    if (!this.oauth2Client) throw new Error('Google OAuth is not configured');
    const { tokens } = await this.oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error('No refresh token returned. User may have already granted access.');
    }
    return tokens.refresh_token;
  }

  async getBusySlots(refreshToken: string, timeMin: Date, timeMax: Date, calendarId = 'primary'): Promise<{ start: Date; end: Date }[]> {
    if (!this.oauth2Client) throw new Error('Google OAuth is not configured');
    
    const auth = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET')
    );
    auth.setCredentials({ refresh_token: refreshToken });

    const calendar = google.calendar({ version: 'v3', auth });
    
    try {
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: [{ id: calendarId }],
        },
      });

      const busySlots = response.data.calendars?.[calendarId]?.busy || [];
      return busySlots.map((slot) => ({
        start: new Date(slot.start!),
        end: new Date(slot.end!),
      }));
    } catch (error) {
      this.logger.error(`Error fetching Google Calendar busy slots: ${(error as Error).message}`);
      return [];
    }
  }
}
