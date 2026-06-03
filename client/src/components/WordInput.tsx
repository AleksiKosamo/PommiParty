import { useState, useEffect, useRef, FormEvent } from 'react';

interface Props {
  syllable: string;
  isMyTurn: boolean;
  rejection: string | null;
  accepted: string | null;
  onSubmit: (word: string) => void;
  onTyping?: (word: string) => void;
}

export default function WordInput({
  syllable,
  isMyTurn,
  rejection,
  accepted,
  onSubmit,
  onTyping,
}: Props) {
  const [word, setWord] = useState('');
  const [shaking, setShaking] = useState(false);
  const [flash, setFlash] = useState<'accept' | 'reject' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when it's my turn
  useEffect(() => {
    if (isMyTurn) inputRef.current?.focus();
  }, [isMyTurn]);

  // Handle rejection animation
  useEffect(() => {
    if (rejection) {
      setShaking(true);
      setFlash('reject');
      setWord('');
      onTyping?.('');
      setTimeout(() => setShaking(false), 400);
      setTimeout(() => setFlash(null), 2500);
    }
  }, [rejection]);

  // Handle acceptance flash
  useEffect(() => {
    if (accepted) {
      setFlash('accept');
      setWord('');
      onTyping?.('');
      setTimeout(() => setFlash(null), 1000);
    }
  }, [accepted]);

  // Clear input when it's no longer my turn (bomb passed)
  useEffect(() => {
    if (!isMyTurn) {
      setWord('');
    }
  }, [isMyTurn]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-zäöå]/g, '');
    setWord(val);
    if (isMyTurn) onTyping?.(val);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !isMyTurn) return;
    onSubmit(word.trim());
  };

  // Highlight the syllable in the typed word
  const renderPreview = () => {
    if (!word) return null;
    const lower = word.toLowerCase();
    const idx = lower.indexOf(syllable.toLowerCase());
    if (idx === -1) return <span>{word}</span>;
    return (
      <>
        {word.slice(0, idx)}
        <span className="match">{word.slice(idx, idx + syllable.length)}</span>
        {word.slice(idx + syllable.length)}
      </>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Live syllable preview */}
      <div className="word-preview" aria-live="polite">
        {word ? (
          renderPreview()
        ) : (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {isMyTurn ? `Kirjoita sana jossa on "${syllable}"...` : 'Odota vuoroasi...'}
          </span>
        )}
      </div>

      {/* Input row */}
      <form className="word-input-wrapper" onSubmit={handleSubmit} autoComplete="off">
        <input
          id="word-input"
          ref={inputRef}
          type="text"
          className={[
            'word-input-field',
            shaking ? 'shake' : '',
            flash === 'accept' ? 'accepted' : '',
          ].join(' ')}
          value={word}
          onChange={handleChange}
          disabled={!isMyTurn}
          placeholder={isMyTurn ? `"${syllable}" → ?` : 'Odota...'}
          aria-label="Kirjoita sana"
          maxLength={40}
          spellCheck={false}
        />
        <button
          id="submit-word-btn"
          type="submit"
          className="btn btn-primary submit-btn"
          disabled={!isMyTurn || !word.trim()}
          aria-label="Lähetä sana"
        >
          →
        </button>
      </form>

      {/* Feedback message */}
      {flash === 'reject' && rejection && (
        <div className="feedback-msg reject" role="alert">
          ❌ {rejection}
        </div>
      )}
      {flash === 'accept' && accepted && (
        <div className="feedback-msg accept" role="status">
          ✅ {accepted} — hyväksytty!
        </div>
      )}
    </div>
  );
}
