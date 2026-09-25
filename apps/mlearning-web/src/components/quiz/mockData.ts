import type { QuestionData, NavigatorState } from './types';

export const questionData: QuestionData = {
  number: 14,
  totalQuestions: 25,
  type: 'Single Choice',
  points: 2.0,
  prompt: [
    { value: 'In the Raft consensus algorithm, when a follower node experiences an election timeout without receiving any ' },
    { value: 'AppendEntries RPC', code: true },
    { value: ' or ' },
    { value: 'RequestVote RPC', code: true },
    { value: ' from a leader or candidate, what immediate state transition and sequence of actions does it perform?' },
  ],
  specTitle: 'FORMAL STATE SPECIFICATION (§5.2 LEADER ELECTION)',
  specLink: 'RFC Consensus Model',
  specLines: [
    '[State: Follower]',
    '  |',
    '  (election timeout elapses without heartbeat)',
    '  v',
    '[State: Candidate]',
    '  - currentTerm += 1',
    '  - votedFor = self.nodeId',
    '  - broadcast RequestVote(term=currentTerm, candidateId=self.nodeId, ...)',
  ],
  options: [
    {
      id: 'A',
      text: [
        { value: 'It enters the Candidate state, increments its ' },
        { value: 'currentTerm', code: true },
        { value: ', votes for itself, and broadcasts ' },
        { value: 'RequestVote', code: true },
        { value: ' RPCs to all other nodes in the cluster.' },
      ],
    },
    {
      id: 'B',
      text: [
        { value: 'It immediately transitions to Leader state and begins transmitting empty ' },
        { value: 'AppendEntries', code: true },
        { value: ' heartbeats to re-establish network authority.' },
      ],
    },
    {
      id: 'C',
      text: [
        { value: 'It resets its election timer, remains in Follower state, and logs a split-vote warning to cluster logs without notifying peers.' },
      ],
    },
    {
      id: 'D',
      text: [
        { value: 'It contacts the configuration coordination service (such as Apache ' },
        { value: 'ZooKeeper', code: true },
        { value: ') to verify leader lease validity before incrementing its internal term counter.' },
      ],
    },
  ],
  selectedOptionId: 'A',
  citation:
    'Ongaro, D., & Ousterhout, J. (2014). "In Search of an Understandable Consensus Algorithm." USENIX ATC \'14. Section 5.2.',
};

export const navigatorState: NavigatorState = {
  totalQuestions: 25,
  current: 14,
  answeredCount: 14,
  flaggedCount: 2,
  unansweredCount: 9,
  flaggedIds: [7, 19],
  nextUnanswered: 15,
  answeredIds: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14],
};
