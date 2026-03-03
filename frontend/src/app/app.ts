import { afterNextRender, Component, inject, PLATFORM_ID, signal } from '@angular/core';
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

        <section class="card card--spaced">
          <div class="card__header card__header--split">
            <h2 class="card__title">Tarefas</h2>
            <div class="card__meta">
              <span class="pill" [class.pill--ok]="tasks().length > 0">{{ tasks().length }}</span>
            </div>
          </div>
          @if (loading()) {
            <div class="muted">Carregando...</div>
          }
          @if (error()) {
            <div class="alert">{{ error() }}</div>
          }

          @if (!loading() && tasks().length === 0) {
            <div class="empty">Nenhuma tarefa cadastrada.</div>
          }

          <ul class="tasks">
          @for (t of tasks(); track t.id) {
            <li class="task" [class.task--done]="t.completed">
              @if (editingId !== t.id) {
                <div class="task__row">
                  <div class="task__content">
                    <div class="task__title">{{ t.title }}</div>
                    @if (t.description) {
                      <div class="task__desc">{{ t.description }}</div>
                    }
                    <div class="task__meta">
                      <span class="status" [class.status--done]="t.completed">
                        {{ t.completed ? 'Concluída' : 'Pendente' }}
                      </span>
                    </div>
                  </div>

                  <div class="task__actions">
                    <label class="toggle" [title]="t.completed ? 'Marcar como pendente' : 'Marcar como concluída'">
                      <input type="checkbox" [checked]="t.completed" (change)="toggleCompleted(t)" />
                      <span>{{ t.completed ? 'Reabrir' : 'Concluir' }}</span>
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

  title = '';
  description = '';

  editingId: number | null = null;
  editTitle = '';
  editDescription = '';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => this.refresh());
    }
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<Task[]>(`${this.baseUrl}/tasks`).subscribe({
      next: (tasks) => {
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
    this.http.put<Task>(`${this.baseUrl}/tasks/${t.id}`, { completed: !t.completed }).subscribe({
      next: () => this.refresh(),
      error: () => {
        this.error.set('Falha ao atualizar status');
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
}
