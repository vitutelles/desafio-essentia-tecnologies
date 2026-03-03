import { Router } from 'express'
import { prisma } from '../db'
import { createTaskSchema, updateTaskSchema } from './validation/task'

export const tasksRouter = Router()

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