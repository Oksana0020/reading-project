export type QuizQuestion = { answer: string };
export type SubmittedQuizAnswer = { questionIndex: number; selectedAnswer: string };

export function scoreQuiz(questions: QuizQuestion[], submitted: SubmittedQuizAnswer[]) {
  return questions.map((question, questionIndex) => {
    const selectedAnswer = submitted.find(answer => answer.questionIndex === questionIndex)?.selectedAnswer || "";
    return { questionIndex, selectedAnswer, correct: selectedAnswer === question.answer };
  });
}
