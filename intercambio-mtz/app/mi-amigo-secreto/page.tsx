export default function MiAmigoSecretoPage() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6 overflow-y-auto"
      style={{
        background: 'linear-gradient(135deg, #0f1923 0%, #1a2a1a 50%, #0f1923 100%)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <h1
        className="text-3xl font-bold mb-8 text-center"
        style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}
      >
        Mi Amigo Secreto
      </h1>
      <p className="text-lg text-center" style={{ color: 'rgba(255,255,255,0.8)' }}>
        Aquí puedes ver a quién le toca tu regalo.
      </p>
    </div>
  );
}