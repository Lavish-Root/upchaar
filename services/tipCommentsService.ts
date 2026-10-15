import { TipComment } from '../types';
import { UniversalChatSession } from './aiService';


const STORAGE_KEY = 'ai_upchaar_tip_comments_v2';
const REACTIONS_STORAGE_KEY = 'ai_upchaar_tip_reactions_v2';

export const TIP_EMOJIS = ['❤️', '👍', '🙏', '💡', '🔥', '👏'] as const;
export type TipEmoji = typeof TIP_EMOJIS[number];

export interface TipReactionStore {
  counts: Record<string, number>;
  userReactions: Record<string, string>; // userId -> emoji
}

const INITIAL_MOCK_REACTIONS: Record<string, TipReactionStore> = {
  'T-001': {
    counts: { '❤️': 245, '👍': 84, '💡': 56, '🙏': 42, '🔥': 19, '👏': 28 },
    userReactions: {}
  },
  'T-002': {
    counts: { '❤️': 189, '👍': 63, '💡': 41, '🙏': 27, '👏': 15, '🔥': 22 },
    userReactions: {}
  },
  'T-003': {
    counts: { '❤️': 532, '👍': 142, '💡': 98, '🙏': 76, '🔥': 45, '👏': 60 },
    userReactions: {}
  }
};

const INITIAL_MOCK_COMMENTS: Record<string, TipComment[]> = {
  'T-001': [
    {
      id: 'c1',
      tipId: 'T-001',
      author: 'Ramesh Kumar',
      authorRole: 'PATIENT',
      isDoctor: false,
      text: 'This is very helpful! I will try to get some sun tomorrow morning.',
      time: '2 hours ago',
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
      likes: 3,
      parentId: null
    },
    {
      id: 'c2',
      tipId: 'T-001',
      author: 'Sunita Devi',
      authorRole: 'PATIENT',
      isDoctor: false,
      text: 'Does it have to be direct sunlight or works through a window?',
      time: '1 hour ago',
      timestamp: Date.now() - 60 * 60 * 1000,
      likes: 6,
      parentId: null
    },
    {
      id: 'r1',
      tipId: 'T-001',
      author: 'Dr. A. Sharma',
      authorRole: 'DOCTOR',
      isDoctor: true,
      doctorSpecialization: 'General Physician',
      text: '@Sunita Devi Direct morning sunlight is most effective! Window glass filters out over 90% of UVB rays which your skin needs to synthesize Vitamin D3. Try spending 10-15 minutes outdoors on a balcony or courtyard before 9 AM.',
      time: '40 mins ago',
      timestamp: Date.now() - 40 * 60 * 1000,
      likes: 15,
      parentId: 'c2',
      replyToAuthor: 'Sunita Devi'
    },
    {
      id: 'c3',
      tipId: 'T-001',
      author: 'Vikram Singh',
      authorRole: 'PATIENT',
      isDoctor: false,
      text: 'Dr. Sharma, can I get sunlight in the evening instead?',
      time: '45 mins ago',
      timestamp: Date.now() - 45 * 60 * 1000,
      likes: 4,
      parentId: null
    },
    {
      id: 'c4',
      tipId: 'T-001',
      author: 'Anita Kaur',
      authorRole: 'PATIENT',
      isDoctor: false,
      text: 'I started doing this and my energy levels are much better.',
      time: '15 mins ago',
      timestamp: Date.now() - 15 * 60 * 1000,
      likes: 2,
      parentId: null
    }
  ],
  'T-002': [
    {
      id: 'c5',
      tipId: 'T-002',
      author: 'Gurpreet Singh',
      authorRole: 'PATIENT',
      isDoctor: false,
      text: 'I started doing this last week and my acidity is completely gone. Thank you doctor!',
      time: '5 hours ago',
      timestamp: Date.now() - 5 * 60 * 60 * 1000,
      likes: 9,
      parentId: null
    },
    {
      id: 'c6',
      tipId: 'T-002',
      author: 'Balwinder Singh',
      authorRole: 'PATIENT',
      isDoctor: false,
      text: 'Is 7 PM a good time for dinner?',
      time: '3 hours ago',
      timestamp: Date.now() - 3 * 60 * 60 * 1000,
      likes: 5,
      parentId: null
    },
    {
      id: 'r2',
      tipId: 'T-002',
      author: 'Dr. P. Kaur',
      authorRole: 'DOCTOR',
      isDoctor: true,
      doctorSpecialization: 'Cardiologist',
      text: '@Balwinder Singh Yes, 7:00 PM to 7:30 PM is ideal if you sleep around 10:00 or 10:30 PM. It allows your digestive system to process food properly before you lie flat, preventing acid reflux.',
      time: '2 hours ago',
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
      likes: 12,
      parentId: 'c6',
      replyToAuthor: 'Balwinder Singh'
    },
    {
      id: 'c7_q',
      tipId: 'T-002',
      author: 'Priya Sharma',
      authorRole: 'PATIENT',
      isDoctor: false,
      text: 'Dr. Kaur, does drinking warm turmeric milk before sleep affect this dinner rule?',
      time: '25 mins ago',
      timestamp: Date.now() - 25 * 60 * 1000,
      likes: 3,
      parentId: null
    },
    {
      id: 'c7',
      tipId: 'T-002',
      author: 'Amit Roy',
      authorRole: 'PATIENT',
      isDoctor: false,
      text: 'Tried it yesterday, definitely slept better!',
      time: 'Just now',
      timestamp: Date.now() - 5 * 60 * 1000,
      likes: 1,
      parentId: null
    }
  ],
  'T-003': [
    {
      id: 'c8',
      tipId: 'T-003',
      author: 'Ramesh Kumar',
      authorRole: 'PATIENT',
      isDoctor: false,
      text: 'I always forget to drink water, keeping a pot nearby is a great idea.',
      time: '1 day ago',
      timestamp: Date.now() - 24 * 60 * 60 * 1000,
      likes: 7,
      parentId: null
    },
    {
      id: 'c9',
      tipId: 'T-003',
      author: 'Sunita Devi',
      authorRole: 'PATIENT',
      isDoctor: false,
      text: 'Should the water be cold or room temperature?',
      time: '12 hours ago',
      timestamp: Date.now() - 12 * 60 * 60 * 1000,
      likes: 8,
      parentId: null
    },
    {
      id: 'r3',
      tipId: 'T-003',
      author: 'Dr. A. Sharma',
      authorRole: 'DOCTOR',
      isDoctor: true,
      doctorSpecialization: 'General Physician',
      text: '@Sunita Devi Naturally cooled water from an earthen pot (matka) or room-temperature water is best for digestion and throat health. Ice-cold water can shock your digestive system during hot weather.',
      time: '10 hours ago',
      timestamp: Date.now() - 10 * 60 * 60 * 1000,
      likes: 21,
      parentId: 'c9',
      replyToAuthor: 'Sunita Devi'
    },
    {
      id: 'c10_q',
      tipId: 'T-003',
      author: 'Karan Mehra',
      authorRole: 'PATIENT',
      isDoctor: false,
      text: 'Dr. Sharma, is water stored in a copper vessel better than an earthen matka?',
      time: '35 mins ago',
      timestamp: Date.now() - 35 * 60 * 1000,
      likes: 5,
      parentId: null
    }
  ]
};

// Listeners for reactive updates
type CommentsListener = () => void;
const commentsListeners = new Set<CommentsListener>();
const reactionsListeners = new Set<CommentsListener>();

export const subscribeToTipComments = (listener: CommentsListener) => {
  commentsListeners.add(listener);
  return () => {
    commentsListeners.delete(listener);
  };
};

export const subscribeToTipReactions = (listener: CommentsListener) => {
  reactionsListeners.add(listener);
  return () => {
    reactionsListeners.delete(listener);
  };
};

const notifyListeners = () => {
  commentsListeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('Error notifying comment listener', e);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai_upchaar_comments_updated'));
  }
};

const notifyReactionListeners = () => {
  reactionsListeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('Error notifying reaction listener', e);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai_upchaar_reactions_updated'));
  }
};

// Cross-tab & window sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      commentsListeners.forEach(fn => fn());
    }
    if (e.key === REACTIONS_STORAGE_KEY) {
      reactionsListeners.forEach(fn => fn());
    }
  });
  window.addEventListener('ai_upchaar_comments_updated', () => {
    commentsListeners.forEach(fn => fn());
  });
  window.addEventListener('ai_upchaar_reactions_updated', () => {
    reactionsListeners.forEach(fn => fn());
  });
}

// Load all tip comments from localStorage
export const loadAllTipComments = (): Record<string, TipComment[]> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse tip comments from localStorage, using defaults');
  }
  // Initialize with initial mock data
  saveAllTipComments(INITIAL_MOCK_COMMENTS);
  return INITIAL_MOCK_COMMENTS;
};

// Save all tip comments to localStorage
export const saveAllTipComments = (data: Record<string, TipComment[]>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save tip comments to localStorage', e);
  }
  notifyListeners();
};

// --- REACTION SERVICES ---
export const loadAllTipReactions = (): Record<string, TipReactionStore> => {
  try {
    const raw = localStorage.getItem(REACTIONS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse tip reactions from localStorage, using defaults');
  }
  saveAllTipReactions(INITIAL_MOCK_REACTIONS);
  return INITIAL_MOCK_REACTIONS;
};

export const saveAllTipReactions = (data: Record<string, TipReactionStore>) => {
  try {
    localStorage.setItem(REACTIONS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save tip reactions to localStorage', e);
  }
  notifyReactionListeners();
};

export const getTipReactions = (tipId: string, userId?: string) => {
  const all = loadAllTipReactions();
  const tipData = all[tipId] || {
    counts: { '❤️': 12, '👍': 5, '💡': 3, '🙏': 2, '🔥': 1, '👏': 1 },
    userReactions: {}
  };

  const counts: Record<string, number> = { ...tipData.counts };
  // Ensure all standard emojis exist in counts
  TIP_EMOJIS.forEach(emoji => {
    if (counts[emoji] === undefined) {
      counts[emoji] = 0;
    }
  });

  const userEmoji = userId ? tipData.userReactions[userId] : undefined;
  const total = Object.values(counts).reduce((acc, c) => acc + (c || 0), 0);

  return { counts, total, userEmoji };
};

export const reactToTip = (tipId: string, emoji: string, userId: string = 'guest') => {
  const all = loadAllTipReactions();
  if (!all[tipId]) {
    all[tipId] = {
      counts: { '❤️': 10, '👍': 5, '💡': 3, '🙏': 2, '🔥': 1, '👏': 1 },
      userReactions: {}
    };
  }

  const tipData = all[tipId];
  if (!tipData.counts) tipData.counts = {};
  if (!tipData.userReactions) tipData.userReactions = {};

  const existingEmoji = tipData.userReactions[userId];

  if (existingEmoji === emoji) {
    // User clicked the same emoji again -> remove reaction (toggle off)
    tipData.counts[emoji] = Math.max(0, (tipData.counts[emoji] || 1) - 1);
    delete tipData.userReactions[userId];
  } else {
    // If user already had a different emoji, decrement old one
    if (existingEmoji && tipData.counts[existingEmoji]) {
      tipData.counts[existingEmoji] = Math.max(0, tipData.counts[existingEmoji] - 1);
    }
    // Increment new emoji
    tipData.counts[emoji] = (tipData.counts[emoji] || 0) + 1;
    tipData.userReactions[userId] = emoji;
  }

  saveAllTipReactions(all);
};

// Get raw comment list for a specific tip
export const getCommentsForTip = (tipId: string): TipComment[] => {
  const all = loadAllTipComments();
  return all[tipId] || [];
};

// Organized into Parent comments and nested child replies (like Instagram)
export interface ThreadedComment {
  parent: TipComment;
  replies: TipComment[];
}

export const getOrganizedComments = (tipId: string): ThreadedComment[] => {
  const comments = getCommentsForTip(tipId);
  const parentMap = new Map<string, ThreadedComment>();
  const orphanedReplies: TipComment[] = [];

  // 1. Identify all parent comments (parentId is null or empty)
  comments.forEach(c => {
    if (!c.parentId) {
      parentMap.set(c.id, { parent: c, replies: [] });
    }
  });

  // 2. Attach replies to their respective parents
  comments.forEach(c => {
    if (c.parentId) {
      if (parentMap.has(c.parentId)) {
        parentMap.get(c.parentId)!.replies.push(c);
      } else {
        // Fallback: If parent comment was deleted or missing, treat as top-level or attach to first
        orphanedReplies.push(c);
      }
    }
  });

  const result = Array.from(parentMap.values());
  // Include orphaned replies if any
  orphanedReplies.forEach(orphan => {
    result.push({ parent: orphan, replies: [] });
  });

  return result;
};

// Add a comment or doctor reply
export const addTipComment = (params: {
  tipId: string;
  text: string;
  author: string;
  authorRole?: 'DOCTOR' | 'PATIENT';
  isDoctor?: boolean;
  doctorSpecialization?: string;
  parentId?: string | null;
  replyToAuthor?: string;
}): TipComment => {
  const all = loadAllTipComments();
  const currentList = all[params.tipId] || [];

  const newComment: TipComment = {
    id: 'cm_' + Math.random().toString(36).substring(2, 9),
    tipId: params.tipId,
    text: params.text.trim(),
    author: params.author,
    authorRole: params.authorRole || (params.isDoctor ? 'DOCTOR' : 'PATIENT'),
    isDoctor: params.isDoctor ?? false,
    doctorSpecialization: params.doctorSpecialization,
    time: 'Just now',
    timestamp: Date.now(),
    likes: 0,
    likedByMe: false,
    parentId: params.parentId || null,
    replyToAuthor: params.replyToAuthor
  };

  all[params.tipId] = [...currentList, newComment];
  saveAllTipComments(all);
  return newComment;
};

// Toggle like on comment or reply
export const toggleCommentLike = (tipId: string, commentId: string): void => {
  const all = loadAllTipComments();
  const currentList = all[tipId] || [];

  const updated = currentList.map(c => {
    if (c.id === commentId) {
      const alreadyLiked = c.likedByMe;
      return {
        ...c,
        likes: (c.likes || 0) + (alreadyLiked ? -1 : 1),
        likedByMe: !alreadyLiked
      };
    }
    return c;
  });

  all[tipId] = updated;
  saveAllTipComments(all);
};

export interface TipCommentStats {
  total: number;
  questions: number; // backward compatibility: maps to unansweredQuestions so badges reflect remaining questions
  unansweredQuestions: number;
  answeredQuestions: number;
  totalQuestions: number;
  doctorReplies: number;
}

// Count summary for UI badges with real-time question answering status
export const getTipCommentCounts = (tipId: string): TipCommentStats => {
  const comments = getCommentsForTip(tipId);
  const total = comments.length;

  const isQuestion = (c: TipComment) => {
    if (c.isDoctor) return false;
    const txt = c.text.toLowerCase();
    return (
      txt.includes('?') ||
      txt.includes('dr.') ||
      txt.includes('doctor') ||
      txt.includes('kya') ||
      txt.includes('how') ||
      txt.includes('when') ||
      txt.includes('can i') ||
      txt.includes('should i') ||
      txt.includes('batao') ||
      txt.includes('kitna') ||
      txt.includes('help')
    );
  };

  const questionComments = comments.filter(isQuestion);
  const doctorReplies = comments.filter(c => c.isDoctor);

  let answeredCount = 0;
  let unansweredCount = 0;

  questionComments.forEach(q => {
    // A question is answered if any doctor reply targets it or addresses the author
    const hasDoctorAnswer = doctorReplies.some(dr => {
      if (dr.parentId === q.id) return true;
      if (dr.replyToAuthor && dr.replyToAuthor.toLowerCase() === q.author.toLowerCase()) return true;
      if (dr.text.toLowerCase().includes(`@${q.author.toLowerCase()}`)) return true;
      return false;
    });

    if (hasDoctorAnswer) {
      answeredCount++;
    } else {
      unansweredCount++;
    }
  });

  return {
    total,
    questions: unansweredCount, // badges display remaining questions needing attention
    unansweredQuestions: unansweredCount,
    answeredQuestions: answeredCount,
    totalQuestions: questionComments.length,
    doctorReplies: doctorReplies.length
  };
};

// Curated clinical quick responses for doctors depending on question keywords
export const getSuggestedDoctorReplies = (tipTitle: string, questionText: string): string[] => {
  const q = questionText.toLowerCase();

  if (q.includes('window') || q.includes('glass')) {
    return [
      'Direct outdoor sunlight is necessary. Standard window glass blocks up to 95% of beneficial UVB rays needed for Vitamin D.',
      'Glass lets warmth (infrared) and UVA through, but filters out UVB. Please step outside on a terrace, veranda or open window for 10-15 minutes.',
      'Even sitting near an open window (without glass in between) will work wonderfully.'
    ];
  }

  if (q.includes('evening') || q.includes('afternoon') || q.includes('night') || q.includes('time')) {
    return [
      'Morning sunlight before 9 AM has the optimal UV balance with zero risk of sunburn. Evening sun is relaxing but does not produce Vitamin D.',
      'Aim for 7:30 AM to 9:00 AM. In the evening, the sun is at too low of an angle for effective Vitamin D synthesis.',
      'Morning sunlight also sets your circadian clock, ensuring deep sleep at night.'
    ];
  }

  if (q.includes('cold') || q.includes('warm') || q.includes('water') || q.includes('drink')) {
    return [
      'Naturally cooled earthen pot (matka) water or room temperature water is ideal. Very chilled ice water can hinder digestion.',
      'Sip water steadily throughout the day rather than chugging large amounts at once. Room temperature is gentlest on your gut.',
      'Add a pinch of rock salt (sendha namak) or lemon slice during hot summer afternoons for natural electrolytes.'
    ];
  }

  if (q.includes('dinner') || q.includes('time') || q.includes('sleep') || q.includes('eat') || q.includes('7 pm')) {
    return [
      'Finishing dinner 2.5 to 3 hours before bedtime prevents acid reflux and promotes restorative deep sleep.',
      'Keep dinner lighter than lunch. Lentils, steamed vegetables, and light soups are ideal for easy digestion.',
      'A 10-minute slow stroll (Shatapawali) after dinner aids gastric motility significantly.'
    ];
  }

  // General clinical fallback responses
  return [
    'Thank you for asking! Maintaining this daily habit consistently will give you the best long-term health benefits.',
    'Always listen to your body and adjust moderately. If you have any specific chronic condition, consult your physician before major changes.',
    'Great question! Consistency is key here. Start with small, comfortable durations and build up gradually.'
  ];
};

// AI Doctor Reply Generator using Universal Chat / Groq / Gemini
export const generateAIDoctorReply = async (
  tip: { title: string; content: string; doctorName?: string },
  question: string,
  doctorName: string
): Promise<string> => {
  const prompt = `You are ${doctorName}, a verified medical doctor.
A patient has commented on your health tip:
Tip Title: "${tip.title}"
Tip Content: "${tip.content}"

Patient's Question: "${question}"

Provide a warm, professional, clinically accurate, and concise reply (1-3 sentences maximum) suitable for an Instagram-style medical health tip comment section. Directly address the patient's question with practical advice. Do not include markdown headers or greetings like "Dear patient", keep it natural like a doctor replying in social comments.`;

  try {
    const session = new UniversalChatSession();
    const response = await session.sendMessage({ message: prompt });
    if (response && response.text && response.text.trim().length > 0) {
      return response.text.trim();
    }
  } catch (e) {
    console.warn('AI generator error, using smart fallback', e);
  }


  // Fallback to top curated suggestion
  const suggestions = getSuggestedDoctorReplies(tip.title, question);
  return suggestions[0];
};
