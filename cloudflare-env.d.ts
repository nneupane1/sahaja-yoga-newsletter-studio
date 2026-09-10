declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    ADMIN_EMAILS?: string;
    APP_BASE_URL?: string;
  }
}
