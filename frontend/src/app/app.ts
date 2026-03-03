import { afterNextRender, Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Task = {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

type ColumnKey = 'todo' | 'done';
type OrderState = { todo: number[]; done: number[] };

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  template: `
    <div class="page">
      <header class="topbar">
        <div class="topbar__inner">
          <div class="brand">
            <div class="brand__logo">TX</div>
            <div class="brand__text">
              <h1 class="brand__title">TechX</h1>
              <div class="brand__subtitle">To-do</div>
            </div>
          </div>

          <button class="btn btn--ghost" (click)="refresh()" [disabled]="loading()">Atualizar</button>
        </div>
      </header>

      <main class="container">
        <section class="card">
          <div class="card__header">
            <h2 class="card__title">Nova tarefa</h2>
          </div>

          <div class="form">
            <div class="field">
              <label class="label">Título</label>
              <input class="input" [(ngModel)]="title" placeholder="Ex.: Estudar Angular" />
            </div>

            <div class="field">
              <label class="label">Descrição</label>
              <textarea class="textarea" [(ngModel)]="description" placeholder="Opcional" rows="3"></textarea>
            </div>

            <div class="actions">
              <button class="btn" (click)="add()" [disabled]="!title.trim()">Adicionar</button>
            </div>
          </div>
        </section>

        @if (loading()) {
          <div class="muted">Carregando...</div>
        }
        @if (error()) {
          <div class="alert">{{ error() }}</div>
        }

        <div class="hint">
          Dica: arraste os cards para reordenar ou mover entre “Pendentes” e “Concluídas”.
        </div>

        <section class="board">
          <section
            class="card column"
            [class.column--over]="dragOverColumn() === 'todo'"
            (dragover)="onColumnDragOver($event, 'todo')"
            (drop)="onColumnDrop($event, 'todo')"
          >
            <div class="card__header card__header--split">
              <h2 class="card__title">Pendentes</h2>
              <span class="pill pill--todo">{{ todoTasks().length }}</span>
            </div>

            <div class="column__body">
              @if (!loading() && todoTasks().length === 0) {
                <div class="empty">Arraste tarefas para cá ou crie uma nova.</div>
              }

              <ul class="tasks">
                @for (t of todoTasks(); track t.id) {
                  <li
                    class="task"
                    [class.task--dragging]="draggingId() === t.id"
                    [class.task--drop]="dragOverColumn() === 'todo' && dragOverId() === t.id"
                    [draggable]="editingId !== t.id"
                    (dragstart)="onTaskDragStart($event, t)"
                    (dragend)="onTaskDragEnd()"
                    (dragover)="onTaskDragOver($event, 'todo', t.id)"
                    (drop)="onTaskDrop($event, 'todo', t.id)"
                  >
                    @if (editingId !== t.id) {
                      <div class="task__row">
                        <div class="task__content">
                          <div class="task__title">{{ t.title }}</div>
                          @if (t.description) {
                            <div class="task__desc">{{ t.description }}</div>
                          }
                          <div class="task__meta">
                            <span class="status">Pendente</span>
                          </div>
                        </div>

                        <div class="task__actions">
                          <label class="toggle" title="Marcar como concluída">
                            <input type="checkbox" [checked]="t.completed" (change)="toggleCompleted(t)" />
                            <span>Concluir</span>
                          </label>
                          <button class="btn btn--ghost" (click)="startEdit(t)">Editar</button>
                          <button class="btn btn--danger" (click)="remove(t.id)">Remover</button>
                        </div>
                      </div>
                    } @else {
                      <div class="task__edit">
                        <div class="field">
                          <label class="label">Título</label>
                          <input class="input" [(ngModel)]="editTitle" placeholder="Título" />
                        </div>
                        <div class="field">
                          <label class="label">Descrição</label>
                          <textarea class="textarea" [(ngModel)]="editDescription" placeholder="Opcional" rows="3"></textarea>
                        </div>
                        <div class="actions actions--row">
                          <button class="btn" (click)="saveEdit(t.id)" [disabled]="!editTitle.trim()">Salvar</button>
                          <button class="btn btn--ghost" (click)="cancelEdit()">Cancelar</button>
                        </div>
                      </div>
                    }
                  </li>
                }
              </ul>
            </div>
          </section>

          <section
            class="card column column--done"
            [class.column--over]="dragOverColumn() === 'done'"
            (dragover)="onColumnDragOver($event, 'done')"
            (drop)="onColumnDrop($event, 'done')"
          >
            <div class="card__header card__header--split">
              <h2 class="card__title">Concluídas</h2>
              <span class="pill pill--ok">{{ doneTasks().length }}</span>
            </div>

            <div class="column__body">
              @if (!loading() && doneTasks().length === 0) {
                <div class="empty">Marque como concluída ou arraste para cá.</div>
              }

              <ul class="tasks">
                @for (t of doneTasks(); track t.id) {
                  <li
                    class="task task--done"
                    [class.task--dragging]="draggingId() === t.id"
                    [class.task--drop]="dragOverColumn() === 'done' && dragOverId() === t.id"
                    [draggable]="editingId !== t.id"
                    (dragstart)="onTaskDragStart($event, t)"
                    (dragend)="onTaskDragEnd()"
                    (dragover)="onTaskDragOver($event, 'done', t.id)"
                    (drop)="onTaskDrop($event, 'done', t.id)"
                  >
                    @if (editingId !== t.id) {
                      <div class="task__row">
                        <div class="task__content">
                          <div class="task__title">{{ t.title }}</div>
                          @if (t.description) {
                            <div class="task__desc">{{ t.description }}</div>
                          }
                          <div class="task__meta">
                            <span class="status status--done">Concluída</span>
                          </div>
                        </div>

                        <div class="task__actions">
                          <label class="toggle" title="Reabrir (voltar para pendentes)">
                            <input type="checkbox" [checked]="t.completed" (change)="toggleCompleted(t)" />
                            <span>Reabrir</span>
                          </label>
                          <button class="btn btn--ghost" (click)="startEdit(t)">Editar</button>
                          <button class="btn btn--danger" (click)="remove(t.id)">Remover</button>
                        </div>
                      </div>
                    } @else {
                      <div class="task__edit">
                        <div class="field">
                          <label class="label">Título</label>
                          <input class="input" [(ngModel)]="editTitle" placeholder="Título" />
                        </div>
                        <div class="field">
                          <label class="label">Descrição</label>
                          <textarea class="textarea" [(ngModel)]="editDescription" placeholder="Opcional" rows="3"></textarea>
                        </div>
                        <div class="actions actions--row">
                          <button class="btn" (click)="saveEdit(t.id)" [disabled]="!editTitle.trim()">Salvar</button>
                          <button class="btn btn--ghost" (click)="cancelEdit()">Cancelar</button>
                        </div>
                      </div>
                    }
                  </li>
                }
              </ul>
            </div>
          </section>
        </section>
      </main>
    </div>
  `,
  styleUrl: './app.css'
})
export class App {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = 'http://localhost:3000';

  tasks = signal<Task[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  private readonly orderStorageKey = 'techx_task_order_v1';
  order = signal<OrderState>({ todo: [], done: [] });

  draggingId = signal<number | null>(null);
  dragOverId = signal<number | null>(null);
  dragOverColumn = signal<ColumnKey | null>(null);

  todoTasks = computed(() => this.sortColumn(this.tasks().filter((t) => !t.completed), 'todo'));
  doneTasks = computed(() => this.sortColumn(this.tasks().filter((t) => t.completed), 'done'));

  title = '';
  description = '';

  editingId: number | null = null;
  editTitle = '';
  editDescription = '';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.order.set(this.loadOrder());
      afterNextRender(() => this.refresh());
    }
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<Task[]>(`${this.baseUrl}/tasks`).subscribe({
      next: (tasks) => {
        this.normalizeOrder(tasks);
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);

        if (err?.status === 0) {
          this.error.set(`Backend offline em ${this.baseUrl} (rode \"npm run dev\" em /backend)`);
          return;
        }

        this.error.set('Falha ao carregar tarefas');
      }
    });
  }

  add(): void {
    const title = this.title.trim();
    const description = this.description.trim();

    if (!title) return;

    this.http
      .post<Task>(`${this.baseUrl}/tasks`, { title, description: description ? description : undefined })
      .subscribe({
        next: () => {
          this.title = '';
          this.description = '';
          this.refresh();
        },
        error: () => {
          this.error.set('Falha ao criar tarefa');
        }
      });
  }

  startEdit(t: Task): void {
    this.editingId = t.id;
    this.editTitle = t.title;
    this.editDescription = t.description ?? '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editTitle = '';
    this.editDescription = '';
  }

  saveEdit(id: number): void {
    const title = this.editTitle.trim();
    const description = this.editDescription.trim();

    if (!title) return;

    this.http
      .put<Task>(`${this.baseUrl}/tasks/${id}`, { title, description: description ? description : null })
      .subscribe({
        next: () => {
          this.cancelEdit();
          this.refresh();
        },
        error: () => {
          this.error.set('Falha ao atualizar tarefa');
        }
      });
  }

  toggleCompleted(t: Task): void {
    const nextCompleted = !t.completed;
    const nextColumn: ColumnKey = nextCompleted ? 'done' : 'todo';

    this.moveInOrder(t.id, nextColumn);
    this.tasks.set(this.tasks().map((x) => (x.id === t.id ? { ...x, completed: nextCompleted } : x)));

    this.http.put<Task>(`${this.baseUrl}/tasks/${t.id}`, { completed: nextCompleted }).subscribe({
      next: (updated) => {
        this.tasks.set(this.tasks().map((x) => (x.id === t.id ? updated : x)));
      },
      error: () => {
        this.error.set('Falha ao atualizar status');
        this.refresh();
      }
    });
  }

  remove(id: number): void {
    this.http.delete<void>(`${this.baseUrl}/tasks/${id}`).subscribe({
      next: () => this.refresh(),
      error: () => {
        this.error.set('Falha ao remover tarefa');
      }
    });
  }

  onTaskDragStart(ev: DragEvent, t: Task): void {
    if (!ev.dataTransfer) return;

    this.draggingId.set(t.id);
    this.dragOverId.set(null);
    this.dragOverColumn.set(t.completed ? 'done' : 'todo');

    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', String(t.id));
  }

  onTaskDragEnd(): void {
    this.draggingId.set(null);
    this.dragOverId.set(null);
    this.dragOverColumn.set(null);
  }

  onColumnDragOver(ev: DragEvent, column: ColumnKey): void {
    ev.preventDefault();
    this.dragOverColumn.set(column);
    this.dragOverId.set(null);
  }

  onColumnDrop(ev: DragEvent, column: ColumnKey): void {
    ev.preventDefault();
    const dragId = this.extractDragId(ev);
    if (dragId == null) return;

    this.applyDrop(dragId, column);
    this.onTaskDragEnd();
  }

  onTaskDragOver(ev: DragEvent, column: ColumnKey, overId: number): void {
    ev.preventDefault();
    this.dragOverColumn.set(column);
    this.dragOverId.set(overId);
  }

  onTaskDrop(ev: DragEvent, column: ColumnKey, overId: number): void {
    ev.preventDefault();
    const dragId = this.extractDragId(ev);
    if (dragId == null) return;

    this.applyDrop(dragId, column, overId);
    this.onTaskDragEnd();
  }

  private applyDrop(taskId: number, targetColumn: ColumnKey, beforeId?: number): void {
    const current = this.tasks().find((t) => t.id === taskId);
    if (!current) return;

    const sourceColumn: ColumnKey = current.completed ? 'done' : 'todo';

    this.moveInOrder(taskId, targetColumn, beforeId);

    if (sourceColumn === targetColumn) return;

    const nextCompleted = targetColumn === 'done';
    this.tasks.set(this.tasks().map((t) => (t.id === taskId ? { ...t, completed: nextCompleted } : t)));

    this.http.put<Task>(`${this.baseUrl}/tasks/${taskId}`, { completed: nextCompleted }).subscribe({
      next: (updated) => {
        this.tasks.set(this.tasks().map((t) => (t.id === taskId ? updated : t)));
      },
      error: () => {
        this.error.set('Falha ao mover tarefa');
        this.refresh();
      }
    });
  }

  private extractDragId(ev: DragEvent): number | null {
    const raw = ev.dataTransfer?.getData('text/plain');
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  }

  private loadOrder(): OrderState {
    try {
      const raw = localStorage.getItem(this.orderStorageKey);
      if (!raw) return { todo: [], done: [] };
      const parsed = JSON.parse(raw) as Partial<OrderState>;
      return {
        todo: Array.isArray(parsed.todo) ? parsed.todo.filter((x) => Number.isFinite(x)) : [],
        done: Array.isArray(parsed.done) ? parsed.done.filter((x) => Number.isFinite(x)) : [],
      };
    } catch {
      return { todo: [], done: [] };
    }
  }

  private saveOrder(state: OrderState): void {
    try {
      localStorage.setItem(this.orderStorageKey, JSON.stringify(state));
    } catch {
      return;
    }
  }

  private normalizeOrder(tasks: Task[]): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const todoIds = tasks.filter((t) => !t.completed).map((t) => t.id);
    const doneIds = tasks.filter((t) => t.completed).map((t) => t.id);

    const todoSet = new Set(todoIds);
    const doneSet = new Set(doneIds);

    const current = this.order();

    const nextTodo: number[] = current.todo.filter((id) => todoSet.has(id));
    for (const id of todoIds) if (!nextTodo.includes(id)) nextTodo.push(id);

    const nextDone: number[] = current.done.filter((id) => doneSet.has(id));
    for (const id of doneIds) if (!nextDone.includes(id)) nextDone.push(id);

    const next: OrderState = { todo: nextTodo, done: nextDone };

    if (next.todo.join(',') === current.todo.join(',') && next.done.join(',') === current.done.join(',')) {
      return;
    }

    this.order.set(next);
    this.saveOrder(next);
  }

  private sortColumn(list: Task[], column: ColumnKey): Task[] {
    const ids = column === 'todo' ? this.order().todo : this.order().done;
    const idx = new Map<number, number>(ids.map((id, i) => [id, i]));

    return [...list].sort((a, b) => {
      const ai = idx.has(a.id) ? (idx.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
      const bi = idx.has(b.id) ? (idx.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }

  private moveInOrder(taskId: number, target: ColumnKey, beforeId?: number): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const current = this.order();
    const todo = current.todo.filter((id) => id !== taskId);
    const done = current.done.filter((id) => id !== taskId);

    const list = target === 'todo' ? todo : done;

    if (beforeId != null) {
      const i = list.indexOf(beforeId);
      if (i >= 0) list.splice(i, 0, taskId);
      else list.push(taskId);
    } else {
      list.push(taskId);
    }

    const next: OrderState = { todo, done };
    this.order.set(next);
    this.saveOrder(next);
  }
}
