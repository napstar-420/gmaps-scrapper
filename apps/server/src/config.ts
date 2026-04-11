import { cleanEnv, num, str } from 'envalid'

export const env = cleanEnv(process.env, {
    PORT: num({ devDefault: 8080 }),
    DATABASE_URL: str(),
    CLIENT_ORIGIN: str(),
})

export const config = {
    port: env.PORT,
    dbUrl: env.DATABASE_URL,
    clientOrigin: env.CLIENT_ORIGIN,
}
