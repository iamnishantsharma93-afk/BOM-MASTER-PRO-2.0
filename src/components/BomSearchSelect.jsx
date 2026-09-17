import { useEffect, useState } from "react";

export default function BomSearchSelect({ onSelectModel }) {
  const [query, setQuery] = useState("");
  const [models, setModels] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setModels([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(
        "http://localhost:3000/api/bom/models?q=" +
          encodeURIComponent(query)
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setModels(data.models);
            setOpen(true);
          }
        })
        .catch(() => setModels([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const pickModel = (model) => {
    setQuery(model);
    setOpen(false);
    onSelectModel(model);
  };

  return (
    <div className="bom-search-select">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => models.length && setOpen(true)}
        placeholder="Search Model No. from AI database..."
      />

      {open && models.length > 0 && (
        <div className="bom-search-dropdown">
          {models.map((model) => (
            <div
              key={model}
              className="bom-search-option"
              onClick={() => pickModel(model)}
            >
              {model}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}