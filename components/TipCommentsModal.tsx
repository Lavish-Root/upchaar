import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Heart, Send, Smile, X, CheckCircle,
  Sparkles, Stethoscope, CornerDownRight, HelpCircle,
  ChevronDown, ChevronUp, Check, AlertCircle, Loader2
} from 'lucide-react';
import { HealthTip, User, UserRole, TipComment } from '../types';
import {
  getOrganizedComments,
  addTipComment,
  toggleCommentLike,
  getTipCommentCounts,
  getSuggestedDoctorReplies,
  generateAIDoctorReply,
  subscribeToTipComments,
  getTipReactions,
  subscribeToTipReactions,
  reactToTip,
  TIP_EMOJIS,
  ThreadedComment
} from '../services/tipCommentsService';

interface TipCommentsModalProps {
  tip: HealthTip | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

const EMOJI_QUICK_LIST = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];

const FULL_EMOJI_LIST = [
  '❤️', '😘', '👍', '😂', '😑', '🔥', '😍', '🙃', '🤣',
  '🙄', '😐', '😞', '😅', '😶', '✨', '🫠', '😮', '🤤',
  '🫣', '🥹', '😁', '❣️', '😔', '😬', '🎉', '💯', '🙏',
  '🤯', '😓', '🎊', '😰', '🙌', '🩺', '💊', '🌿', '☀️'
];

export const TipCommentsModal: React.FC<TipCommentsModalProps> = ({
  tip,
  isOpen,
  onClose,
  currentUser
}) => {
  if (!isOpen || !tip) return null;

  const [commentInput, setCommentInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    author: string;
    text: string;
  } | null>(null);
  const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Load threaded comments from service
  const [threads, setThreads] = useState<ThreadedComment[]>(() =>
    getOrganizedComments(tip.id)
  );

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const [, setReactionVersion] = useState(0);

  // Subscribe to updates from other views/storage
  useEffect(() => {
    const refresh = () => {
      setThreads(getOrganizedComments(tip.id));
    };
    refresh();
    const unsubComments = subscribeToTipComments(refresh);
    const unsubReactions = subscribeToTipReactions(() => {
      setReactionVersion(v => v + 1);
    });
    return () => {
      unsubComments();
      unsubReactions();
    };
  }, [tip.id]);

  // Focus input when replyingTo changes
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  const isCurrentUserDoctor =
    currentUser.role === UserRole.DOCTOR ||
    currentUser.name.toLowerCase().startsWith('dr.') ||
    currentUser.specialization;

  const isTipAuthor =
    isCurrentUserDoctor &&
    (currentUser.id === tip.doctorId ||
      currentUser.name.toLowerCase() === tip.doctorName.toLowerCase());

  // Handle Post Comment or Reply
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentInput.trim()) return;

    let textToPost = commentInput.trim();

    // If replying to someone and text does not mention them yet, optionally prepend @username
    if (replyingTo && !textToPost.startsWith(`@${replyingTo.author}`)) {
      textToPost = `@${replyingTo.author} ${textToPost}`;
    }

    addTipComment({
      tipId: tip.id,
      text: textToPost,
      author: currentUser.name,
      authorRole: isCurrentUserDoctor ? 'DOCTOR' : 'PATIENT',
      isDoctor: isCurrentUserDoctor,
      doctorSpecialization: currentUser.specialization || (isCurrentUserDoctor ? 'Verified Physician' : undefined),
      parentId: replyingTo ? replyingTo.id : null,
      replyToAuthor: replyingTo ? replyingTo.author : undefined
    });

    setCommentInput('');
    setReplyingTo(null);
    setShowEmojiPicker(false);

    // Expand the replies for the parent comment so the user sees their reply
    if (replyingTo) {
      setCollapsedReplies(prev => ({
        ...prev,
        [replyingTo.id]: false
      }));
    }
  };

  const handleToggleLike = (commentId: string) => {
    toggleCommentLike(tip.id, commentId);
  };

  const handleStartReply = (comment: TipComment) => {
    setReplyingTo({
      id: comment.parentId || comment.id, // attach to root parent or current comment
      author: comment.author,
      text: comment.text
    });
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const toggleRepliesCollapse = (parentId: string) => {
    setCollapsedReplies(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  // Generate AI Doctor Reply
  const handleGenerateAIDraft = async () => {
    if (!replyingTo) return;
    setIsGeneratingAI(true);
    setAiSuccessMessage(null);
    try {
      const generated = await generateAIDoctorReply(
        tip,
        replyingTo.text,
        currentUser.name || tip.doctorName
      );
      setCommentInput(generated);
      setAiSuccessMessage('AI clinical answer drafted! Review or tweak before posting.');
      setTimeout(() => setAiSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAI(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Quick suggestions for the currently selected question
  const suggestedReplies = replyingTo
    ? getSuggestedDoctorReplies(tip.title, replyingTo.text)
    : [];

  const counts = getTipCommentCounts(tip.id);
  const reactions = getTipReactions(tip.id, currentUser.id);

  // Helper to format comment text with highlighted mentions (@Name)
  const renderCommentText = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9\s.]+?)(?=\s|$|[.,!?])/g);
    return (
      <span>
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            return (
              <span key={i} className="text-blue-600 font-semibold hover:underline cursor-pointer">
                {part}{' '}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Instagram-Style Sheet / Modal Container */}
      <div className="bg-white w-full sm:max-w-xl md:max-w-2xl max-h-[92vh] sm:rounded-3xl rounded-t-3xl shadow-2xl relative flex flex-col animate-in slide-in-from-bottom duration-300 z-10 overflow-hidden border border-slate-200/80">
        
        {/* Mobile Pull Handle */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/90 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquare size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-slate-800 text-base">
                  Comments
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {counts.total}
                </span>
                {counts.unansweredQuestions > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    {counts.unansweredQuestions} Question Waiting
                  </span>
                ) : counts.answeredQuestions > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle size={10} /> All Answered
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {counts.totalQuestions > 0
                  ? `${counts.totalQuestions} Questions (${counts.answeredQuestions} Answered) • ${counts.doctorReplies} Doctor Replies`
                  : 'Community discussions & doctor advice'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Comments & Post Section */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 no-scrollbar">

          {/* Original Doctor's Health Tip Pinned at Top */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-emerald-500" />
            <div className="flex items-start gap-3 pl-1">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-md shrink-0 border-2 border-white">
                {tip.doctorName.replace('Dr.', '').trim().charAt(0) || 'D'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="font-bold text-sm text-slate-900">{tip.doctorName}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    <Stethoscope size={10} /> Verified Doctor
                  </span>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    Author
                  </span>
                  <span className="text-[10px] text-slate-400 ml-auto font-medium">
                    {new Date(tip.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm mb-1">{tip.title}</h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-3">{tip.content}</p>

                {/* Real-time Emoji Reactions Bar inside Original Tip */}
                <div className="pt-2.5 border-t border-slate-200/80 flex items-center flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Reactions:</span>
                  {TIP_EMOJIS.map(emoji => {
                    const count = reactions.counts[emoji] || 0;
                    const isUserReacted = reactions.userEmoji === emoji;
                    return (
                      <button
                        key={emoji}
                        onClick={() => reactToTip(tip.id, emoji, currentUser.id)}
                        title={`React with ${emoji} (Current: ${count})`}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all transform active:scale-95 ${
                          isUserReacted
                            ? 'bg-rose-50 border border-rose-300 text-rose-700 shadow-xs ring-1 ring-rose-300 scale-105'
                            : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="text-sm leading-none">{emoji}</span>
                        <span className={`text-[11px] ${isUserReacted ? 'font-bold text-rose-700' : 'text-slate-500'}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section Divider */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Discussion ({counts.total})
            </span>
            {isCurrentUserDoctor && (
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100">
                <CheckCircle size={12} className="text-emerald-600" /> Replying as {currentUser.name}
              </span>
            )}
          </div>

          {/* Comments List */}
          {threads.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare size={24} />
              </div>
              <h5 className="font-bold text-slate-700 text-sm">No comments yet</h5>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Be the first to ask a question or share how this tip helped you!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {threads.map(({ parent, replies }, index) => {
                const isQuestion =
                  !parent.isDoctor &&
                  (parent.text.includes('?') ||
                    parent.text.toLowerCase().includes('dr.') ||
                    parent.text.toLowerCase().includes('doctor') ||
                    parent.text.toLowerCase().includes('kya') ||
                    parent.text.toLowerCase().includes('how') ||
                    parent.text.toLowerCase().includes('when') ||
                    parent.text.toLowerCase().includes('can i') ||
                    parent.text.toLowerCase().includes('should i'));
                const hasDoctorReply = replies.some(r => r.isDoctor);
                const isRepliesCollapsed = collapsedReplies[parent.id] ?? false;

                return (
                  <div
                    key={parent.id}
                    className="group transition duration-200 animate-in fade-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
                  >
                    {/* Parent Comment Item */}
                    <div className="flex gap-3 items-start">
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border ${
                          parent.isDoctor
                            ? 'bg-blue-600 text-white border-blue-400'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {parent.isDoctor ? (
                          <Stethoscope size={16} />
                        ) : (
                          parent.author.charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* Comment Body */}
                      <div className="flex-1 min-w-0">
                        <div className={`p-3 rounded-2xl rounded-tl-sm border transition ${
                          isQuestion && !hasDoctorReply
                            ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-50'
                            : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70'
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-900">
                                {parent.author}
                              </span>
                              {parent.isDoctor && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                                  <Stethoscope size={8} /> Doctor
                                </span>
                              )}
                              {parent.isDoctor && parent.author === tip.doctorName && (
                                <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                  Author
                                </span>
                              )}
                              {isQuestion && (
                                hasDoctorReply ? (
                                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle size={9} /> Answered
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                    <HelpCircle size={9} /> Pending Answer
                                  </span>
                                )
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {parent.time}
                            </span>
                          </div>

                          {/* Text */}
                          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed break-words">
                            {renderCommentText(parent.text)}
                          </p>
                        </div>

                        {/* Instagram-style Action Row under comment */}
                        <div className="flex items-center gap-4 mt-1.5 px-2 text-[11px] text-slate-500">
                          <span className="text-slate-400">{parent.time}</span>

                          {/* Like Button */}
                          <button
                            onClick={() => handleToggleLike(parent.id)}
                            className={`flex items-center gap-1 font-semibold transition hover:text-rose-600 ${
                              parent.likedByMe ? 'text-rose-600' : 'text-slate-500'
                            }`}
                          >
                            <Heart
                              size={13}
                              className={parent.likedByMe ? 'fill-rose-600 text-rose-600' : ''}
                            />
                            {(parent.likes || 0) > 0 && <span>{parent.likes}</span>}
                          </button>

                          {/* REPLY BUTTON (Instagram Style!) */}
                          <button
                            onClick={() => handleStartReply(parent)}
                            className="font-bold text-slate-600 hover:text-blue-600 transition flex items-center gap-1"
                          >
                            <CornerDownRight size={12} />
                            Reply
                          </button>

                          {/* Doctor Quick-Reply action indicator if this is an unanswered question */}
                          {isCurrentUserDoctor && isQuestion && replies.length === 0 && (
                            <button
                              onClick={() => handleStartReply(parent)}
                              className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full transition flex items-center gap-1 ml-auto"
                            >
                              <Stethoscope size={10} /> Answer Question
                            </button>
                          )}
                        </div>

                        {/* Nested Replies Section (Threaded like Instagram) */}
                        {replies.length > 0 && (
                          <div className="mt-2.5">
                            {/* Toggle Show/Hide Replies Button (Instagram Style: —— View 1 reply) */}
                            <button
                              onClick={() => toggleRepliesCollapse(parent.id)}
                              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-2 transition px-2"
                            >
                              <span className="w-6 h-[1.5px] bg-slate-300 inline-block" />
                              {isRepliesCollapsed ? (
                                <>
                                  View {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                                  <ChevronDown size={12} />
                                </>
                              ) : (
                                <>
                                  Hide {replies.length === 1 ? 'reply' : 'replies'}
                                  <ChevronUp size={12} />
                                </>
                              )}
                            </button>

                            {/* Replies List */}
                            {!isRepliesCollapsed && (
                              <div className="space-y-2.5 pl-6 sm:pl-8 border-l-2 border-slate-200/80 ml-3">
                                {replies.map(reply => (
                                  <div
                                    key={reply.id}
                                    className="flex gap-2.5 items-start group/reply animate-in fade-in slide-in-from-left-2 duration-200"
                                  >
                                    {/* Reply Avatar */}
                                    <div
                                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm border ${
                                        reply.isDoctor
                                          ? 'bg-emerald-600 text-white border-emerald-400'
                                          : 'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      {reply.isDoctor ? (
                                        <Stethoscope size={13} />
                                      ) : (
                                        reply.author.charAt(0).toUpperCase()
                                      )}
                                    </div>

                                    {/* Reply Content Card */}
                                    <div className="flex-1 min-w-0">
                                      <div
                                        className={`p-2.5 rounded-2xl rounded-tl-sm border transition ${
                                          reply.isDoctor
                                            ? 'bg-emerald-50/70 border-emerald-200/90 shadow-sm'
                                            : 'bg-slate-50/80 border-slate-200/60'
                                        }`}
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                          <div className="flex items-center gap-1 flex-wrap">
                                            <span
                                              className={`font-bold text-xs ${
                                                reply.isDoctor ? 'text-emerald-950' : 'text-slate-900'
                                              }`}
                                            >
                                              {reply.author}
                                            </span>

                                            {reply.isDoctor && (
                                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded-full">
                                                <Check size={8} strokeWidth={3} /> Verified Doctor
                                              </span>
                                            )}

                                            {reply.isDoctor && reply.author === tip.doctorName && (
                                              <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full">
                                                Author
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[9px] text-slate-400">
                                            {reply.time}
                                          </span>
                                        </div>

                                        <p className="text-xs text-slate-800 leading-relaxed break-words">
                                          {renderCommentText(reply.text)}
                                        </p>
                                      </div>

                                      {/* Nested Reply Action Bar */}
                                      <div className="flex items-center gap-3 mt-1 px-1.5 text-[10px] text-slate-400">
                                        <span>{reply.time}</span>
                                        <button
                                          onClick={() => handleToggleLike(reply.id)}
                                          className={`flex items-center gap-1 font-semibold hover:text-rose-600 ${
                                            reply.likedByMe ? 'text-rose-600' : 'text-slate-500'
                                          }`}
                                        >
                                          <Heart
                                            size={11}
                                            className={reply.likedByMe ? 'fill-rose-600 text-rose-600' : ''}
                                          />
                                          {(reply.likes || 0) > 0 && <span>{reply.likes}</span>}
                                        </button>
                                        <button
                                          onClick={() => handleStartReply(reply)}
                                          className="font-bold text-slate-600 hover:text-blue-600"
                                        >
                                          Reply
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={commentsEndRef} />
            </div>
          )}
        </div>

        {/* Replying Banner (Instagram Style!) */}
        {replyingTo && (
          <div className="bg-blue-50/90 border-t border-blue-100 px-4 py-2 flex items-center justify-between shrink-0 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 min-w-0">
              <CornerDownRight size={14} className="text-blue-600 shrink-0" />
              <div className="truncate">
                <span className="text-xs text-blue-900">
                  Replying to <strong className="font-bold text-blue-700">@{replyingTo.author}</strong>
                </span>
                <p className="text-[11px] text-slate-500 truncate max-w-sm">"{replyingTo.text}"</p>
              </div>
            </div>
            <button
              onClick={handleCancelReply}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-blue-100 transition shrink-0 ml-2"
              title="Cancel reply"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Doctor-Specific Smart Clinical Assistance & Quick Answers */}
        {isCurrentUserDoctor && replyingTo && (
          <div className="bg-emerald-50/80 border-t border-emerald-100 px-4 py-2.5 shrink-0 flex flex-col gap-1.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <Stethoscope size={13} className="text-emerald-600" />
                <span>Doctor Quick-Reply Assistance:</span>
              </div>
              <button
                onClick={handleGenerateAIDraft}
                disabled={isGeneratingAI}
                className="text-[11px] font-bold bg-white text-emerald-700 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1 transition shadow-xs disabled:opacity-50"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 size={12} className="animate-spin text-emerald-600" /> Drafting...
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-amber-500 fill-amber-400" /> AI Doctor Draft
                  </>
                )}
              </button>
            </div>

            {aiSuccessMessage && (
              <span className="text-[11px] text-emerald-700 font-medium">{aiSuccessMessage}</span>
            )}

            {/* Quick Answer Chips */}
            {suggestedReplies.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[10px] text-slate-400 shrink-0">Suggestions:</span>
                {suggestedReplies.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCommentInput(suggestion);
                      if (inputRef.current) inputRef.current.focus();
                    }}
                    className="text-[11px] bg-white border border-emerald-200 text-slate-700 hover:bg-emerald-100/70 hover:text-emerald-900 px-2.5 py-1 rounded-full whitespace-nowrap transition shrink-0 max-w-[280px] truncate text-left"
                    title={suggestion}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input Bar & Emojis (Instagram Style) */}
        <div className="p-3 border-t border-slate-100 bg-white shrink-0">
          {/* Quick Emoji Bar */}
          {!showEmojiPicker && (
            <div className="flex items-center justify-between px-2 pb-2 gap-2 overflow-x-auto no-scrollbar">
              {EMOJI_QUICK_LIST.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setCommentInput(prev => prev + emoji)}
                  className="text-xl hover:scale-125 transition-transform duration-150 p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Full Emoji List Drawer */}
          {showEmojiPicker && (
            <div className="grid grid-cols-9 gap-2 p-3 max-h-36 overflow-y-auto mb-2 bg-slate-50 rounded-xl border border-slate-200 shadow-inner no-scrollbar animate-in zoom-in-95 duration-150">
              {FULL_EMOJI_LIST.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => setCommentInput(prev => prev + emoji)}
                  className="text-xl hover:scale-125 transition-transform duration-150 p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Input Box with Current User Avatar & Send Button */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border mb-0.5 ${
                isCurrentUserDoctor
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-emerald-600 text-white border-emerald-400'
              }`}
            >
              {isCurrentUserDoctor ? (
                <Stethoscope size={16} />
              ) : (
                currentUser.name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="flex-1 flex items-end gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <textarea
                ref={inputRef}
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                placeholder={
                  replyingTo
                    ? isCurrentUserDoctor
                      ? `Reply to @${replyingTo.author} as ${currentUser.name}...`
                      : `Reply to @${replyingTo.author}...`
                    : isCurrentUserDoctor
                    ? `Post clinical advice as ${currentUser.name}...`
                    : `Add a comment for ${tip.doctorName}...`
                }
                rows={1}
                className="flex-1 bg-transparent border-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 resize-none py-1.5 max-h-24 min-h-[36px]"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />

              {/* Emoji Picker Toggle Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-1.5 rounded-full transition ${
                  showEmojiPicker
                    ? 'bg-slate-200 text-slate-800'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Pick emoji"
              >
                <Smile size={18} />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!commentInput.trim()}
                className={`p-2 rounded-xl transition font-bold flex items-center justify-center shrink-0 ${
                  commentInput.trim()
                    ? isCurrentUserDoctor
                      ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                      : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Send reply"
              >
                <Send size={15} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TipCommentsModal;
