export interface VocabLanguage {
  id: string;
  user_id: string;
  source_lang: string;
  target_lang: string;
  created_at: string;
}

export interface VocabSet {
  id: string;
  user_id: string;
  language_id: string;
  name: string;
  set_date: string | null;
  high_score_mc: number;
  high_score_type: number;
  created_at: string;
  // computed
  word_count?: number;
}

export interface VocabWord {
  id: string;
  user_id: string;
  set_id: string;
  source_word: string;
  target_word: string;
  created_at: string;
}

export interface VocabProgress {
  id: string;
  user_id: string;
  word_id: string;
  set_id: string;
  correct_count: number;
  wrong_count: number;
  last_reviewed: string | null;
  mastered: boolean;
  created_at: string;
}

export type QuizMode = 'multiple_choice' | 'type_in';

export interface QuizState {
  mode: QuizMode;
  setId: string;
  words: VocabWord[];
  currentIndex: number;
  remaining: VocabWord[];
  wrongQueue: VocabWord[];
  score: number;
  total: number;
  answered: number;
  finished: boolean;
  currentOptions?: string[]; // for MC
  selectedAnswer?: string;
  typedAnswer?: string;
  isCorrect?: boolean;
  showResult: boolean;
}
