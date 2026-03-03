import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { tasksRouter } from './routes/tasks'

const app = express()

app.use(express.json())

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? '*'
  })
)

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/tasks', tasksRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)

  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Validation error', issues: err.issues })
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(500).json({
      message: 'Database error',
      code: err.code
    })
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return res.status(500).json({
      message: 'Database connection error'
    })
  }

  return res.status(500).json({ message: 'Internal server error' })
})

const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => {
  process.stdout.write(`API on http://localhost:${port}\n`)
})