import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { QuizService } from './quiz.service';
import { Quiz } from '../models/quiz.model';
import { environment } from '../../../environments/environment';

describe('QuizService', () => {
  let service: QuizService;
  let httpMock: HttpTestingController;

  const sampleQuiz: Quiz = {
    id: 'quiz-test-1',
    title: 'TypeScript & Angular 21 Architecture',
    description: 'Test your advanced frontend skills',
    category: 'DEVELOPMENT',
    difficulty: 'HARD',
    status: 'PUBLISHED',
    creatorId: 'creator-1',
    creatorName: 'Fatou Sow',
    shareCode: 'TS-ANGULAR-PRO',
    questionsCount: 1,
    participationsCount: 10,
    averageScorePercent: 88,
    visibility: 'PUBLIC',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    questions: [
      {
        id: 'q-1',
        text: 'What are Angular Signals?',
        type: 'SINGLE_CHOICE',
        timeLimitSeconds: 30,
        points: 100,
        order: 1,
        choices: [
          { id: 'c-1', text: 'Reactive state primitives', isCorrect: true, order: 1 },
          { id: 'c-2', text: 'Database drivers', isCorrect: false, order: 2 }
        ]
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        QuizService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(QuizService);
    httpMock = TestBed.inject(HttpTestingController);

    // Drain initial loadBackendQuizzes call from constructor
    const initialReq = httpMock.expectOne(`${environment.apiUrl}/quizzes`);
    expect(initialReq.request.method).toBe('GET');
    initialReq.flush([sampleQuiz]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created and populate initial quizzes', () => {
    expect(service).toBeTruthy();
    expect(service.getQuizzes()().length).toBe(1);
    expect(service.getQuizzes()()[0].id).toBe('quiz-test-1');
  });

  it('should find quiz in memory by id or share code', () => {
    const foundById = service.findQuizByCodeOrPin('quiz-test-1');
    expect(foundById).toBeDefined();
    expect(foundById?.title).toBe('TypeScript & Angular 21 Architecture');

    const foundByCode = service.findQuizByCodeOrPin('ts-angular-pro');
    expect(foundByCode).toBeDefined();
    expect(foundByCode?.id).toBe('quiz-test-1');
  });

  it('should return undefined for non-existent quiz in local cache', () => {
    const notFound = service.findQuizByCodeOrPin('NON-EXISTENT-CODE');
    expect(notFound).toBeUndefined();
  });

  it('should fetch quiz from backend if not present in memory', async () => {
    const remoteQuiz: Quiz = {
      ...sampleQuiz,
      id: 'quiz-remote-99',
      shareCode: 'REMOTE-PIN-99',
      title: 'Remote Cloud Architecture'
    };

    const promise = service.fetchQuizByCodeOrPin('REMOTE-PIN-99');

    const req = httpMock.expectOne(`${environment.apiUrl}/quizzes/code/REMOTE-PIN-99`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: remoteQuiz, message: 'OK' });

    const result = await promise;
    expect(result).toBeDefined();
    expect(result?.id).toBe('quiz-remote-99');
    expect(service.getQuizzes()().some(q => q.id === 'quiz-remote-99')).toBe(true);
  });

  it('should return local quiz directly without backend call when available', async () => {
    const result = await service.fetchQuizByCodeOrPin('TS-ANGULAR-PRO');
    expect(result).toBeDefined();
    expect(result?.id).toBe('quiz-test-1');
    httpMock.expectNone(`${environment.apiUrl}/quizzes/code/TS-ANGULAR-PRO`);
  });

  it('should filter public quizzes', () => {
    const publicList = service.getPublicQuizzes();
    expect(publicList.length).toBe(1);
    expect(publicList[0].visibility).toBe('PUBLIC');
  });
});
