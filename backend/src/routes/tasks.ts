import express, { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../db'
import { createTaskSchema, updateTaskSchema } from './validation/task'

export const tasksRouter = Router()

type AuthUser = { id: number; email?: string }
type AuthRequest = express.Request & { user?: AuthUser }

function requireAuth(req: AuthRequest, res: express.Response, next: express.NextFunction): void {
  const header = req.header('authorization') ?? ''
  const [type, token] = header.split(' ')

  if (type !== 'Bearer' || !token) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    res.status(500).json({ message: 'JWT secret not configured' })
    return
  }

  try {
    const payload = jwt.verify(token, secret) as jwt.JwtPayload

    const sub = payload.sub
    const id = typeof sub === 'string' ? Number(sub) : typeof sub === 'number' ? sub : NaN

    if (!Number.isFinite(id)) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    req.user = { id, email: typeof payload.email === 'string' ? payload.email : undefined }

    next()
  } catch {
    res.status(401).json({ message: 'Unauthorized' })
  }
}

tasksRouter.use(requireAuth)

tasksRouter.get('/', async (_req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(tasks)
  } catch (err) {
    next(err)
  }
})

tasksRouter.post('/', async (req, res, next) => {
  try {
    const input = createTaskSchema.parse(req.body)
    const task = await prisma.task.create({ data: input })
    res.status(201).json(task)
  } catch (err) {
    next(err)
  }
})

tasksRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid id' })

    const input = updateTaskSchema.parse(req.body)

    const exists = await prisma.task.findUnique({ where: { id } })
    if (!exists) return res.status(404).json({ message: 'Task not found' })

    const task = await prisma.task.update({ where: { id }, data: input })
    res.json(task)
  } catch (err) {
    next(err)
  }
})

tasksRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid id' })

    const exists = await prisma.task.findUnique({ where: { id } })
    if (!exists) return res.status(404).json({ message: 'Task not found' })

    await prisma.task.delete({ where: { id } })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})