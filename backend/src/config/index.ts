import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(','),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://praan:praansewa_secret@localhost:5432/praansewa_db?schema=public',

  jwt: {
    secret: process.env.JWT_SECRET || 'praansewa_default_secure_jwt_secret_key_123',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'praansewa_default_refresh_secret_key_456',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'grok',
    grokApiKey: process.env.GROK_API_KEY || process.env.XAI_API_KEY || '',
    grokModel: process.env.GROK_MODEL || 'grok-beta',
    grokBaseUrl: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  },

  voice: {
    sttProvider: process.env.VOICE_STT_PROVIDER || 'browser',
    ttsProvider: process.env.VOICE_TTS_PROVIDER || 'browser',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'PraanSewa Healthcare <noreply@praansewa.health>',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
};
