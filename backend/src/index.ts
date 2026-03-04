import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'
import { Prisma } from '@prisma/client'
import { ZodError, z } from 'zod'
import { prisma } from './db'
import { tasksRouter } from './routes/tasks'

const app = express()

app.use(express.json())

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? '*'
  })
)

app.get('/health', (_req, res) => res.json({ ok: true }))

const authInputSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(200)
})

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set')
  }
  return secret
}

function signToken(user: { id: number; email: string }): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn']

  return jwt.sign(
    { email: user.email },
    getJwtSecret() as Secret,
    {
      subject: String(user.id),
      expiresIn
    }
  )
}

app.post('/auth/register', async (req, res, next) => {
  try {
    const input = authInputSchema.parse(req.body)

    const passwordHash = await bcrypt.hash(input.password, 10)

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash
      },
      select: { id: true, email: true }
    })

    const token = signToken(user)

    res.status(201).json({ token })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ message: 'Email já cadastrado' })
    }

    next(err)
  }
})

app.post('/auth/login', async (req, res, next) => {
  try {
    const input = authInputSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, passwordHash: true }
    })

    if (!user) return res.status(401).json({ message: 'Credenciais inválidas' })

    const ok = await bcrypt.compare(input.password, user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas' })

    const token = signToken(user)

    res.json({ token })
  } catch (err) {
    next(err)
  }
})

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