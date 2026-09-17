export default function ComingSoon({ title, desc }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <p className="hint">{desc}</p>
    </section>
  );
}
