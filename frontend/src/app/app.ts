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
    <div style="max-width: 820px; margin: 24px auto; font-family: Arial, sans-serif; padding: 0 12px;">
      <h1 style="margin: 0 0 16px;">TechX - To-do</h1>

      <div style="padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
        <h3 style="margin: 0 0 12px;">Nova tarefa</h3>

        <div style="display: grid; gap: 8px;">
          <input [(ngModel)]="title" placeholder="Título" />
          <textarea [(ngModel)]="description" placeholder="Descrição (opcional)" rows="3"></textarea>
          <button (click)="add()">Adicionar</button>
        </div>
      </div>

      <div style="margin-top: 16px;">
        @if (loading()) {
          <div>Carregando...</div>
        }
        @if (error()) {
          <div style="color: #b00020;">{{ error() }}</div>
        }

        <h3 style="margin: 16px 0 12px;">Tarefas</h3>

        @if (!loading() && tasks().length === 0) {
          <div>Nenhuma tarefa cadastrada.</div>
        }

        <ul style="list-style: none; padding: 0; display: grid; gap: 10px;">
          @for (t of tasks(); track t.id) {
            <li style="border: 1px solid #eee; border-radius: 8px; padding: 12px;">
              @if (editingId !== t.id) {
                <div style="display: flex; align-items: center; gap: 10px;">
                  <input type="checkbox" [checked]="t.completed" (change)="toggleCompleted(t)" />

                  <div style="flex: 1;">
                    <div [style.textDecoration]="t.completed ? 'line-through' : 'none'">
                      <strong>{{ t.title }}</strong>
                    </div>
                    @if (t.description) {
                      <div>{{ t.description }}</div>
                    }
                  </div>

                  <button (click)="startEdit(t)">Editar</button>
                  <button (click)="remove(t.id)">Remover</button>
                </div>
              } @else {
                <div style="display: grid; gap: 8px;">
                  <input [(ngModel)]="editTitle" placeholder="Título" />
                  <textarea [(ngModel)]="editDescription" placeholder="Descrição (opcional)" rows="3"></textarea>

                  <div style="display: flex; gap: 8px;">
                    <button (click)="saveEdit(t.id)">Salvar</button>
                    <button (click)="cancelEdit()">Cancelar</button>
                  </div>
                </div>
              }
            </li>
          }
        </ul>
      </div>
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
