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

          <div class="topbar__actions">
            @if (token()) {
              <button class="btn btn--ghost" (click)="refresh()" [disabled]="loading()">Atualizar</button>
              <button class="btn btn--ghost" (click)="logout()">Sair</button>
            }
          </div>
        </div>
      </header>

      <main class="container">
        @if (!token()) {
          <section class="card">
            <div class="card__header card__header--split">
              <h2 class="card__title">Acesso</h2>
              <div class="card__meta">
                <button class="btn btn--ghost" (click)="setAuthMode('login')" [disabled]="authLoading()">Entrar</button>
                <button class="btn btn--ghost" (click)="setAuthMode('register')" [disabled]="authLoading()">Criar conta</button>
              </div>
            </div>

            <div class="form">
              <div class="field">
                <label class="label">Email</label>
                <input
                  class="input"
                  [class.input--invalid]="!!authEmailError()"
                  type="email"
                  inputmode="email"
                  autocomplete="email"
                  [maxlength]="authEmailMax"
                  [(ngModel)]="authEmail"
                  (ngModelChange)="authEmail = clamp($event, authEmailMax)"
                  placeholder="seuemail@exemplo.com"
                />
                <div class="field__meta">
                  <div class="field__error">@if (authEmailError()) { {{ authEmailError() }} }</div>
                  <div class="counter">{{ authEmail.length }}/{{ authEmailMax }}</div>
                </div>
              </div>

              <div class="field">
                <label class="label">Senha</label>
                <input
                  class="input"
                  [class.input--invalid]="!!authPasswordError()"
                  type="password"
                  autocomplete="current-password"
                  [maxlength]="authPasswordMax"
                  [(ngModel)]="authPassword"
                  (ngModelChange)="authPassword = clamp($event, authPasswordMax)"
                  placeholder="mín. {{ authPasswordMin }} caracteres"
                />
                <div class="field__meta">
                  <div class="field__error">@if (authPasswordError()) { {{ authPasswordError() }} }</div>
                  <div class="counter">{{ authPassword.length }}/{{ authPasswordMax }}</div>
                </div>
              </div>

              @if (authError()) {
                <div class="alert">{{ authError() }}</div>
              }

              <div class="actions">
                <button class="btn" (click)="submitAuth()" [disabled]="authLoading() || !isAuthValid()">
                  {{ authMode() === 'login' ? 'Entrar' : 'Criar conta' }}
                </button>
              </div>
            </div>
          </section>
        }

        @if (token()) {
          <section class="card">
          <div class="card__header">
            <h2 class="card__title">Nova tarefa</h2>
          </div>

          <div class="form">
            <div class="field">
              <label class="label">Título</label>
              <input
                class="input"
                [class.input--invalid]="!!titleError()"
                [maxlength]="taskTitleMax"
                [(ngModel)]="title"
                (ngModelChange)="title = clamp($event, taskTitleMax)"
                placeholder="Ex.: Estudar Projeto"
              />
              <div class="field__meta">
                <div class="field__error">@if (titleError()) { {{ titleError() }} }</div>
                <div class="counter">{{ title.length }}/{{ taskTitleMax }}</div>
              </div>
            </div>

            <div class="field">
              <label class="label">Descrição</label>
              <textarea
                class="textarea"
                [class.textarea--invalid]="!!descriptionError()"
                [maxlength]="taskDescriptionMax"
                [(ngModel)]="description"
                (ngModelChange)="description = clamp($event, taskDescriptionMax)"
                placeholder="Opcional"
                rows="3"
              ></textarea>
              <div class="field__meta">
                <div class="field__error">@if (descriptionError()) { {{ descriptionError() }} }</div>
                <div class="counter">{{ description.length }}/{{ taskDescriptionMax }}</div>
              </div>
            </div>

            <div class="actions">
              <button class="btn" (click)="add()" [disabled]="!isNewTaskValid()">Adicionar</button>
            </div>
          </div>
          </section>
        }

        @if (loading()) {
          <div class="muted">Carregando...</div>
        }
        @if (error()) {
          <div class="alert">{{ error() }}</div>
        }

        @if (token()) {
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
                          <div class="task__title" [attr.title]="t.title">{{ t.title }}</div>
                          @if (t.description) {
                            <div class="task__desc" [attr.title]="t.description">{{ t.description }}</div>
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
                          <input
                            class="input"
                            [class.input--invalid]="!!editTitleError()"
                            [maxlength]="taskTitleMax"
                            [(ngModel)]="editTitle"
                            (ngModelChange)="editTitle = clamp($event, taskTitleMax)"
                            placeholder="Título"
                          />
                          <div class="field__meta">
                            <div class="field__error">@if (editTitleError()) { {{ editTitleError() }} }</div>
                            <div class="counter">{{ editTitle.length }}/{{ taskTitleMax }}</div>
                          </div>
                        </div>
                        <div class="field">
                          <label class="label">Descrição</label>
                          <textarea
                            class="textarea"
                            [class.textarea--invalid]="!!editDescriptionError()"
                            [maxlength]="taskDescriptionMax"
                            [(ngModel)]="editDescription"
                            (ngModelChange)="editDescription = clamp($event, taskDescriptionMax)"
                            placeholder="Opcional"
                            rows="3"
                          ></textarea>
                          <div class="field__meta">
                            <div class="field__error">@if (editDescriptionError()) { {{ editDescriptionError() }} }</div>
                            <div class="counter">{{ editDescription.length }}/{{ taskDescriptionMax }}</div>
                          </div>
                        </div>
                        <div class="actions actions--row">
                          <button class="btn" (click)="saveEdit(t.id)" [disabled]="!isEditTaskValid()">Salvar</button>
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
                          <div class="task__title" [attr.title]="t.title">{{ t.title }}</div>
                          @if (t.description) {
                            <div class="task__desc" [attr.title]="t.description">{{ t.description }}</div>
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
                          <input
                            class="input"
                            [class.input--invalid]="!!editTitleError()"
                            [maxlength]="taskTitleMax"
                            [(ngModel)]="editTitle"
                            (ngModelChange)="editTitle = clamp($event, taskTitleMax)"
                            placeholder="Título"
                          />
                          <div class="field__meta">
                            <div class="field__error">@if (editTitleError()) { {{ editTitleError() }} }</div>
                            <div class="counter">{{ editTitle.length }}/{{ taskTitleMax }}</div>
                          </div>
                        </div>
                        <div class="field">
                          <label class="label">Descrição</label>
                          <textarea
                            class="textarea"
                            [class.textarea--invalid]="!!editDescriptionError()"
                            [maxlength]="taskDescriptionMax"
                            [(ngModel)]="editDescription"
                            (ngModelChange)="editDescription = clamp($event, taskDescriptionMax)"
                            placeholder="Opcional"
                            rows="3"
                          ></textarea>
                          <div class="field__meta">
                            <div class="field__error">@if (editDescriptionError()) { {{ editDescriptionError() }} }</div>
                            <div class="counter">{{ editDescription.length }}/{{ taskDescriptionMax }}</div>
                          </div>
                        </div>
                        <div class="actions actions--row">
                          <button class="btn" (click)="saveEdit(t.id)" [disabled]="!isEditTaskValid()">Salvar</button>
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
        }
      </main>
    </div>
  `,
  styleUrl: './app.css'
})
export class App {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = 'http://localhost:3000';
  private readonly tokenStorageKey = 'techx_token';

  token = signal<string | null>(null);
  authMode = signal<'login' | 'register'>('login');
  authLoading = signal(false);
  authError = signal<string | null>(null);

  readonly authEmailMax = 255;
  readonly authPasswordMin = 6;
  readonly authPasswordMax = 200;

  authTriedSubmit = false;
  authEmail = '';
  authPassword = '';

  readonly taskTitleMax = 200;
  readonly taskDescriptionMax = 500;

  taskTriedSubmit = false;
  editTriedSubmit = false;

  tasks = signal<Task[]>([]);
  loading = signal(false);
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

      const savedToken = localStorage.getItem(this.tokenStorageKey);
      if (savedToken) this.token.set(savedToken);

      afterNextRender(() => {
        if (this.token()) this.refresh();
      });
    }
  }

  refresh(): void {
    if (!this.token()) {
      this.loading.set(false);
      this.tasks.set([]);
      this.error.set('Faça login para ver suas tarefas');
      return;
    }

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
    this.taskTriedSubmit = true;

    const title = this.title.trim();
    const description = this.description.trim();

    if (!this.isNewTaskValid()) return;

    this.http
      .post<Task>(`${this.baseUrl}/tasks`, { title, description: description ? description : undefined })
      .subscribe({
        next: () => {
          this.title = '';
          this.description = '';
          this.taskTriedSubmit = false;
          this.refresh();
        },
        error: () => {
          this.error.set('Falha ao criar tarefa');
        }
      });
  }

  startEdit(t: Task): void {
    this.editingId = t.id;
    this.editTriedSubmit = false;
    this.editTitle = t.title;
    this.editDescription = t.description ?? '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editTriedSubmit = false;
    this.editTitle = '';
    this.editDescription = '';
  }

  saveEdit(id: number): void {
    this.editTriedSubmit = true;

    const title = this.editTitle.trim();
    const description = this.editDescription.trim();

    if (!this.isEditTaskValid()) return;

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

  clamp(value: string, max: number): string {
    return value.length > max ? value.slice(0, max) : value;
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private getAuthEmailErrorMessage(): string | null {
    const email = this.authEmail.trim();
    if (!email) return 'Informe um email';
    if (email.length > this.authEmailMax) return `Máximo ${this.authEmailMax} caracteres`;
    if (!this.isValidEmail(email)) return 'Email inválido';
    return null;
  }

  authEmailError(): string | null {
    const message = this.getAuthEmailErrorMessage();
    if (!this.authTriedSubmit && !this.authEmail.trim()) return null;
    return message;
  }

  private getAuthPasswordErrorMessage(): string | null {
    const password = this.authPassword;
    if (!password) return 'Informe uma senha';
    if (password.length < this.authPasswordMin) return `Mínimo ${this.authPasswordMin} caracteres`;
    if (password.length > this.authPasswordMax) return `Máximo ${this.authPasswordMax} caracteres`;
    return null;
  }

  authPasswordError(): string | null {
    const message = this.getAuthPasswordErrorMessage();
    if (!this.authTriedSubmit && this.authPassword.length === 0) return null;
    return message;
  }

  isAuthValid(): boolean {
    return !this.getAuthEmailErrorMessage() && !this.getAuthPasswordErrorMessage();
  }

  private getTitleErrorMessage(value: string): string | null {
    const t = value.trim();
    if (!t) return 'Informe um título';
    if (t.length > this.taskTitleMax) return `Máximo ${this.taskTitleMax} caracteres`;
    return null;
  }

  titleError(): string | null {
    const message = this.getTitleErrorMessage(this.title);
    if (!this.taskTriedSubmit && !this.title.trim()) return null;
    return message;
  }

  private getDescriptionErrorMessage(value: string): string | null {
    if (value.length > this.taskDescriptionMax) return `Máximo ${this.taskDescriptionMax} caracteres`;
    return null;
  }

  descriptionError(): string | null {
    const message = this.getDescriptionErrorMessage(this.description);
    if (!this.taskTriedSubmit && this.description.length === 0) return null;
    return message;
  }

  isNewTaskValid(): boolean {
    return !this.getTitleErrorMessage(this.title) && !this.getDescriptionErrorMessage(this.description);
  }

  editTitleError(): string | null {
    const message = this.getTitleErrorMessage(this.editTitle);
    if (!this.editTriedSubmit && !this.editTitle.trim()) return null;
    return message;
  }

  editDescriptionError(): string | null {
    const message = this.getDescriptionErrorMessage(this.editDescription);
    if (!this.editTriedSubmit && this.editDescription.length === 0) return null;
    return message;
  }

  isEditTaskValid(): boolean {
    return !this.getTitleErrorMessage(this.editTitle) && !this.getDescriptionErrorMessage(this.editDescription);
  }

  setAuthMode(mode: 'login' | 'register'): void {
    this.authMode.set(mode);
    this.authError.set(null);
    this.authTriedSubmit = false;
  }

  submitAuth(): void {
    this.authTriedSubmit = true;

    const email = this.authEmail.trim();
    const password = this.authPassword;

    if (!this.isAuthValid()) return;

    this.authLoading.set(true);
    this.authError.set(null);

    const path = this.authMode() === 'login' ? '/auth/login' : '/auth/register';

    this.http.post<{ token: string }>(`${this.baseUrl}${path}`, { email, password }).subscribe({
      next: ({ token }) => {
        try {
          localStorage.setItem(this.tokenStorageKey, token);
        } catch {
          
        }
        this.token.set(token);
        this.authPassword = '';
        this.authLoading.set(false);
        this.refresh();
      },
      error: (err) => {
        this.authLoading.set(false);

        const message = typeof err?.error?.message === 'string' ? err.error.message : null;
        this.authError.set(message ?? 'Falha na autenticação');
      }
    });
  }

  logout(): void {
    try {
      localStorage.removeItem(this.tokenStorageKey);
    } catch {
      
    }

    this.token.set(null);
    this.tasks.set([]);
    this.loading.set(false);
    this.error.set('Faça login para ver suas tarefas');
  }

  private moveInOrder(taskId: number, target: ColumnKey, beforeId?: number): void {
    if (!this.token()) return;
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
