import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { JoinModalComponent } from './shared/components/join-modal/join-modal.component';
import { QuizModalPlayerComponent } from './shared/components/quiz-modal-player/quiz-modal-player.component';
import { LiveWaitingModalComponent } from './shared/components/live-waiting-modal/live-waiting-modal.component';
import { QuizPlayerModalService } from './core/services/quiz-player-modal.service';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, JoinModalComponent, QuizModalPlayerComponent, LiveWaitingModalComponent, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('quizzboard-client');
  public quizPlayerModalService = inject(QuizPlayerModalService);
}
