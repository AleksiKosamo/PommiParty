interface Props {
  loserName: string;
}

export default function RoundEnd({ loserName }: Props) {
  return (
    <div className="round-end-overlay" role="dialog" aria-label="Kierroksen loppu">
      <span className="explosion-emoji" role="img" aria-label="räjähdys">
        💥
      </span>
      <h2 className="round-end-title">BOOM!</h2>
      <p className="round-end-loser">
        <strong>{loserName}</strong> jäi pitämään pommia!
      </p>
      <div>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            textAlign: 'center',
            marginBottom: '0.75rem',
          }}
        >
          Seuraava kierros alkaa pian...
        </p>
        <div className="next-round-bar">
          <div className="next-round-fill" />
        </div>
      </div>
    </div>
  );
}
