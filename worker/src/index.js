import { DurableObject } from 'cloudflare:workers';

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

export class ApiContainer extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.starting = undefined;
    const container = ctx.container;
    if (container.running) {
      void ctx.blockConcurrencyWhile(() =>
        container.setInactivityTimeout(INACTIVITY_TIMEOUT_MS),
      );
    }
  }

  async fetch(request) {
    this.starting ??= this.startAndWaitForPort().finally(() => {
      this.starting = undefined;
    });
    await this.starting;

    const url = new URL(request.url);
    url.protocol = 'http:';
    url.host = 'container';
    const forwarded = new Request(url, request);
    forwarded.headers.delete('host');
    return this.ctx.container.getTcpPort(8080).fetch(forwarded);
  }

  async startAndWaitForPort() {
    const container = this.ctx.container;
    if (!container.running) {
      container.start({
        image: container.images.base,
        instance: 'lite',
        enableInternet: true,
        env: {
          SPRING_PROFILES_ACTIVE: 'prod',
          PORT: '8080',

          D1_MODE: 'cloudflare',
          CF_ACCOUNT_ID: this.env.CF_ACCOUNT_ID,
          CF_D1_DATABASE_ID: this.env.CF_D1_DATABASE_ID,
          CF_API_TOKEN: this.env.CF_API_TOKEN,

          STORAGE_MODE: 'local',
          LOCAL_STORAGE_ROOT: '/app/.data/files',

          MAIL_DEV_MODE: 'false',
          MAIL_HOST: 'smtp.gmail.com',
          MAIL_PORT: '587',
          MAIL_USERNAME: 'it25patok@gmail.com',
          MAIL_APP_PASSWORD: this.env.MAIL_APP_PASSWORD,

          ADMIN_EMAIL: this.env.ADMIN_EMAIL,
          ADMIN_INITIAL_PASSWORD: this.env.ADMIN_INITIAL_PASSWORD,

          JWT_SECRET: this.env.JWT_SECRET,
          JWT_ACCESS_TTL_MIN: '15',
          JWT_REFRESH_TTL_DAYS: '7',

          CHAT_ENCRYPTION_KEY: this.env.CHAT_ENCRYPTION_KEY,
          CHAT_KEY_VERSION: '1',
          CHAT_RETENTION_DAYS: '7',

          APP_EMAILJS_SERVICE_ID: this.env.APP_EMAILJS_SERVICE_ID,
          APP_EMAILJS_TEMPLATE_ID: this.env.APP_EMAILJS_TEMPLATE_ID,
          APP_EMAILJS_PUBLIC_KEY: this.env.APP_EMAILJS_PUBLIC_KEY,
          APP_EMAILJS_PRIVATE_KEY: this.env.APP_EMAILJS_PRIVATE_KEY,
          APP_EMAILJS_WEBSITE: 'https://it25patok.pages.dev',

          APP_BASE_URL: 'https://it25patok.pages.dev',
          CORS_ALLOWED_ORIGINS: 'https://it25patok.pages.dev,https://it25patok-api.pages.dev,http://localhost:5173',
          COOKIE_SECURE: 'true',
          COOKIE_SAME_SITE: 'None',
        },
      });
    }
    await container.setInactivityTimeout(INACTIVITY_TIMEOUT_MS);

    const port = container.getTcpPort(8080);
    let lastError;
    for (let attempt = 0; attempt < 120; attempt++) {
      try {
        const response = await port.fetch('http://container/actuator/health', {
          signal: AbortSignal.timeout(1500),
        });
        await response.body?.cancel();
        if (!response.ok) {
          throw new Error(`Health check returned ${response.status}`);
        }
        return;
      } catch (error) {
        lastError = error;
        await scheduler.wait(500);
      }
    }
    throw new Error('Container did not become ready on port 8080', { cause: lastError });
  }
}

export default {
  fetch(request, env) {
    return env.API_CONTAINER.getByName('it25patok-api').fetch(request);
  },
};
