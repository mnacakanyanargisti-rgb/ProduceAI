import { StrictMode, Suspense, lazy, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Apple,
  ArrowRight,
  ArrowUpRight,
  ScanLine,
  Sprout,
  Microscope,
  BarChart3,
  Github,
  Upload,
  Check,
  Circle,
  Layers,
  Leaf,
  Menu,
  X,
  Clock3,
  ShieldCheck,
  ChevronRight,
  FlaskConical,
  Cpu,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  loadHistory,
  parsePrediction,
  validateFile,
  type Prediction,
} from "./data";
import "./style.css";
import { inspectImage, type VisualSummary } from "./visual-analysis";
import { classifyAppleInBrowser, getBrowserModelMetadata, type BrowserModelMetadata } from "./browser-model";

const UsageChart = lazy(() =>
  import("./charts").then((m) => ({ default: m.UsageChart })),
);
const LossChart = lazy(() =>
  import("./charts").then((m) => ({ default: m.LossChart })),
);

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const repo = "https://github.com/mnacakanyanargisti-rgb/ProduceAI";
const pages = [
  "Home",
  "AI Scanner",
  "Model Comparison",
  "Analytics",
  "Research",
  "About",
] as const;
type Page = (typeof pages)[number];
type Experiment = {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  inference_ms: number;
  confusion_matrix: number[][];
  history: { epoch: number; train_loss: number; val_loss: number }[];
  test_samples: number;
  dataset: string;
  seed: number;
};
const slug = (p: Page) => p.toLowerCase().replaceAll(" ", "-");
function currentPage(): Page {
  return pages.find((p) => slug(p) === location.hash.slice(2)) || "Home";
}
function Link({
  to,
  children,
  className = "",
}: {
  to: Page;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      className={className}
      aria-current={className === "active" ? "page" : undefined}
      href={"#/" + slug(to)}
    >
      {children}
    </a>
  );
}
function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty">
      <FlaskConical size={34} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function App() {
  const [page, setPage] = useState<Page>(currentPage),
    [menu, setMenu] = useState(false),
    [connected, setConnected] = useState(false),
    [history, setHistory] = useState<Prediction[]>(loadHistory),
    [browserModel, setBrowserModel] = useState<BrowserModelMetadata | null>(null);
  useEffect(() => {
    const change = () => {
      setPage(currentPage());
      setMenu(false);
      window.scrollTo(0, 0);
    };
    addEventListener("hashchange", change);
    return () => removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (!API) return;
    const c = new AbortController();
    fetch(`${API}/health`, { signal: c.signal })
      .then((r) => r.json())
      .then((h) => setConnected(h.model_loaded === true))
      .catch(() => setConnected(false));
    return () => c.abort();
  }, [page]);
  useEffect(() => {
    let active = true;
    getBrowserModelMetadata().then((metadata) => {
      if (active) setBrowserModel(metadata);
    });
    return () => { active = false; };
  }, []);
  function save(p: Prediction) {
    const rows = [...history, p].slice(-500);
    setHistory(rows);
    try {
      localStorage.setItem("produceai.history.v1", JSON.stringify(rows));
      return true;
    } catch {
      return false;
    }
  }
  return (
    <>
      <header>
        <div className="nav-wrap">
          <Link to="Home" className="brand">
            <span className="brand-icon">
              <Apple size={22} />
            </span>
            Produce<span className="green">AI</span>
          </Link>
          <nav className={menu ? "open" : ""} aria-label="Main navigation">
            {pages.map((p) => (
              <Link key={p} to={p} className={p === page ? "active" : ""}>
                {p}
              </Link>
            ))}
          </nav>
          <a
            className="github-nav"
            href={repo}
            target="_blank"
            rel="noreferrer"
          >
            <Github size={17} /> GitHub <ArrowUpRight size={14} />
          </a>
          <button
            className="mobile-toggle"
            onClick={() => setMenu(!menu)}
            aria-label="Toggle navigation"
            aria-expanded={menu}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main>
        {page === "Home" ? (
          <Home />
        ) : page === "AI Scanner" ? (
          <Scanner connected={connected} browserModel={browserModel} save={save} />
        ) : page === "Model Comparison" ? (
          <Comparison />
        ) : page === "Analytics" ? (
          <Analytics
            history={history}
            clear={() => {
              localStorage.removeItem("produceai.history.v1");
              setHistory([]);
            }}
          />
        ) : page === "Research" ? (
          <Research />
        ) : (
          <About />
        )}
      </main>
      <footer>
        <div className="brand">
          <Apple size={20} />
          Produce<span className="green">AI</span>
        </div>
        <p>Smarter Fruit Grading Through Computer Vision</p>
        <span>Research & development · French University in Armenia</span>
        <a
          href={repo}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub repository"
        >
          <Github size={20} />
        </a>
      </footer>
    </>
  );
}
function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> COMPUTER VISION FOR A BETTER HARVEST
            </div>
            <h1>
              Intelligent Apple
              <br />
              Quality Grading
              <br />
              <em>Powered by AI</em>
            </h1>
            <p className="hero-description">
              Smarter Fruit Grading Through Computer Vision
            </p>
            <p className="muted hero-sub">
              Bringing computer vision from the research lab to the orchard.
              Explore a transparent, research-driven approach to fresh and
              defective apple classification.
            </p>
            <div className="actions">
              <Link to="AI Scanner" className="button primary">
                Try AI Scanner <ArrowRight size={18} />
              </Link>
              <Link to="Research" className="button secondary">
                Explore Research <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="hero-footnote">
              <ShieldCheck size={16} />
              <span>Research-first. Transparent by design.</span>
            </div>
          </div>
          <div className="hero-art">
            <img
              src={import.meta.env.BASE_URL + "apple-illustration.svg"}
              alt="Illustrated red apple with a green leaf in a computer vision scan frame"
            />
            <div className="art-top">
              <span className="live-dot" /> APPLE QUALITY INTELLIGENCE
            </div>
            <div className="art-label">
              <ScanLine size={20} />
              <div>
                <strong>A new perspective on produce</strong>
                <span>Computer vision · Apple classification</span>
              </div>
              <ArrowUpRight size={17} />
            </div>
            <div className="art-caption">
              ILLUSTRATIVE VISUAL · NO MODEL PREDICTION
            </div>
          </div>
        </div>
      </section>
      <section className="principles">
        <div>
          <Microscope />
          <span>Built for research</span>
        </div>
        <div>
          <Layers />
          <span>Three model approaches</span>
        </div>
        <div>
          <ShieldCheck />
          <span>Evidence over assumptions</span>
        </div>
        <div>
          <Sprout />
          <span>Designed for agriculture</span>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">FROM PIXELS TO PERSPECTIVE</div>
            <h2>Small steps. Meaningful insights.</h2>
          </div>
          <p>
            A simple workflow, backed by a reproducible
            <br className="desktop" /> machine learning pipeline.
          </p>
        </div>
        <div className="steps">
          {[
            {
              n: "01",
              icon: Upload,
              title: "Upload your apple",
              text: "Drop a JPEG, PNG, or WebP image into the scanner. Clear lighting makes a difference.",
            },
            {
              n: "02",
              icon: Cpu,
              title: "Let the model take a look",
              text: "A connected, trained classifier evaluates the image and returns class probabilities.",
            },
            {
              n: "03",
              icon: BarChart3,
              title: "Explore the evidence",
              text: "Review the prediction, model version, and inference time. Every result has context.",
            },
          ].map((s) => (
            <article className="step" key={s.n}>
              <div className="step-top">
                <span className="icon-box">
                  <s.icon size={23} />
                </span>
                <span>{s.n}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="research-banner">
        <div>
          <div className="eyebrow">THE SCIENCE BEHIND THE SCAN</div>
          <h2>
            Good AI starts with
            <br />
            better questions.
          </h2>
          <p>
            Compare a traditional baseline, a custom CNN, and transfer learning.
            Follow the methodology, understand the limitations, and explore the
            results as experiments become available.
          </p>
          <Link className="text-link" to="Model Comparison">
            Inside our research <ArrowRight size={17} />
          </Link>
        </div>
        <div className="model-stack">
          <div>
            <span className="icon-box">
              <Layers />
            </span>
            <span>
              <strong>Traditional machine learning</strong>
              <small>Color & texture features + SVM</small>
            </span>
            <span className="tag">BASELINE</span>
          </div>
          <div>
            <span className="icon-box">
              <Cpu />
            </span>
            <span>
              <strong>Custom convolutional network</strong>
              <small>Learning visual patterns from scratch</small>
            </span>
            <span className="tag">CNN</span>
          </div>
          <div>
            <span className="icon-box">
              <Sprout />
            </span>
            <span>
              <strong>MobileNetV2</strong>
              <small>Pretrained features, apple-specific training</small>
            </span>
            <span className="tag">TRANSFER</span>
          </div>
          <p>
            <Circle size={9} /> See recorded held-out results in Model Comparison
          </p>
        </div>
      </section>
      <section className="section benefits">
        <div className="eyebrow">GROWN WITH PURPOSE</div>
        <h2>Technology with roots in the real world.</h2>
        <div className="benefit-grid">
          <div>
            <Leaf />
            <h3>Support better sorting</h3>
            <p>
              Investigate how consistent visual screening could support
              producers and reduce manual effort.
            </p>
          </div>
          <div>
            <Sprout />
            <h3>Understand food waste</h3>
            <p>
              Study visible defects as a first step toward more informed
              post-harvest decisions.
            </p>
          </div>
          <div>
            <Github />
            <h3>Build in the open</h3>
            <p>
              Reproducible experiments and documented methods make the research
              easier to question and improve.
            </p>
          </div>
        </div>
      </section>
      <section className="cta">
        <div>
          <h2>Take a closer look at your next harvest.</h2>
          <p>Start with an image. Explore what computer vision can tell you.</p>
        </div>
        <Link to="AI Scanner" className="button primary">
          Open AI Scanner <ArrowRight size={18} />
        </Link>
      </section>
    </>
  );
}
function PageHeading({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      <div className="eyebrow">{label}</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
function Scanner({
  connected,
  browserModel,
  save,
}: {
  connected: boolean;
  browserModel: BrowserModelMetadata | null;
  save: (p: Prediction) => boolean;
}) {
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<Prediction | null>(null),
    [drag, setDrag] = useState(false),
    [storageWarning, setStorageWarning] = useState(""),
    [visual, setVisual] = useState<VisualSummary | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function select(f?: File) {
    if (busy || !f) return;
    setError("");
    setResult(null);
    setVisual(null);
    setStorageWarning("");
    const e = validateFile(f);
    if (e) {
      setError(e);
      setFile(null);
      return;
    }
    setFile(f);
  }
  async function analyze() {
    if (!file) return;
    if (!connected && !browserModel) {
      setBusy(true);
      setError("");
      setResult(null);
      setVisual(null);
      try {
        setVisual(await inspectImage(file));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read the image.");
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    const c = new AbortController(),
      timeout = setTimeout(() => c.abort(), 60000);
    try {
      let predictionBody: unknown;
      if (connected && API) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch(`${API}/predict`, {
          method: "POST",
          body: form,
          signal: c.signal,
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            typeof body.detail === "string"
              ? body.detail
              : "The API could not analyze this image.",
          );
        predictionBody = body;
      } else {
        predictionBody = await classifyAppleInBrowser(file);
      }
      const prediction = {
        ...parsePrediction(predictionBody),
        timestamp: new Date().toISOString(),
        id: crypto.randomUUID(),
      };
      setResult(prediction);
      if (!save(prediction))
        setStorageWarning(
          "Prediction succeeded, but browser storage is unavailable. This result may be lost when you leave.",
        );
    } catch (e) {
      setError(
        e instanceof Error && e.name === "AbortError"
          ? "Analysis timed out after 60 seconds. Check the backend connection."
          : e instanceof Error
            ? e.message
            : "Connection failed. Check the backend URL and CORS settings.",
      );
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <PageHeading
        label="THE AI WORKSPACE"
        title="A closer look, powered by vision."
        description="Upload a photo. The AI first verifies that the object looks like an apple, then classifies supported apples as fresh or defective."
      />
      <div className="status-banner">
        <span className={connected || browserModel ? "live-dot" : "offline-dot"} />
        <strong>{connected ? "AI model connected" : browserModel ? "AI model ready — on-device" : "Model Not Connected"}</strong>
        <span>
          {connected
            ? "Server model ready for image classification"
            : browserModel
              ? `MobileNetV2 trained on apple images · held-out test accuracy ${(browserModel.accuracy * 100).toFixed(1)}% · ${browserModel.test_samples} test images`
              : "Experimental image statistics only. No trained model published yet."}
        </span>
        <Link to="Research">
          Setup & methodology <ChevronRight size={15} />
        </Link>
      </div>
      <div className="scanner-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Upload an image</h2>
            <span className="tag">01 / INPUT</span>
          </div>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            disabled={busy}
            onChange={(e) => select(e.target.files?.[0])}
          />
          <button
            disabled={busy}
            className={"dropzone " + (drag ? "drag" : "")}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              select(e.dataTransfer.files[0]);
            }}
          >
            {preview ? (
              <img src={preview} alt="Your uploaded apple" />
            ) : (
              <>
                <span className="upload-icon">
                  <Upload size={28} />
                </span>
                <strong>Drop your apple image here</strong>
                <span>or click to browse files</span>
                <small>JPEG, PNG, WebP · Up to 8 MB</small>
              </>
            )}
          </button>
          {file && (
            <p className="file-name">
              {file.name}{" "}
              <span>
                {(file.size / 1024).toFixed(0)} KB · Click image to replace
              </span>
            </p>
          )}
          <div className="tip">
            <Leaf size={17} />
            <p>
              For a clearer view, use one apple against a simple background in
              natural light.
            </p>
          </div>
          <button
            className="button primary full"
            disabled={!file || busy}
            onClick={analyze}
          >
            <ScanLine size={19} />
            {busy ? "Analyzing…" : connected || browserModel ? "Classify Apple (AI)" : "Screen Image (Experimental)"}
            <ArrowRight size={17} />
          </button>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Classification results</h2>
            <span className="tag">02 / OUTPUT</span>
          </div>
          {visual ? (
            <div aria-live="polite" className="result">
              <span className="tag">EXPERIMENTAL SCREENING · NOT AI</span>
              <h3>Provisional sorting: {visual.suggestedTier}</h3>
              <p className="muted">
                {visual.suggestedTier === "Review required"
                  ? "No automatic tier assigned — human review required."
                  : "Illustrative A/B/C image screening only. Not UNECE Extra/I/II, not a verified commercial quality grade."}
              </p>
              <dl>
                <dt>Resolution</dt><dd>{visual.width} × {visual.height} px</dd>
                <dt>Mean brightness</dt><dd>{visual.meanBrightness.toFixed(1)}%</dd>
                <dt>Mean saturation</dt><dd>{visual.meanSaturation.toFixed(1)}%</dd>
                <dt>Whole-photo dark pixels</dt><dd>{visual.darkPixelPercent.toFixed(1)}%</dd>
                <dt>Center-sample dark pixels</dt><dd>{visual.estimatedDarkArea.toFixed(1)}%</dd>
                <dt>Screening reliability</dt><dd>{visual.segmentationConfidence}</dd>
                <dt>Pixels sampled</dt><dd>{visual.sampledPixels.toLocaleString()}</dd>
              </dl>
              <p className="muted">{visual.notes}</p>
              <p className="muted">
                The central ellipse is only a rough sampling region, not an
                apple segmentation or defect mask. No trained model was run.
                Shadows, background and apple variety can change the tier.
                Do not use this result to set prices, reject food, or assess safety.
              </p>
            </div>
          ) : result ? (
            <div aria-live="polite" className="result">
              <span className="icon-box">
                <Check />
              </span>
              <p>MODEL PREDICTION</p>
              <h2>{result.label}</h2>
              {result.label === "Not an Apple" && (
                <p className="error" role="status" style={{ marginBottom: 14 }}>
                  Սա խնձոր չէ — Not an Apple. Upload one real apple against a
                  clear background. No fresh/rotten grade has been assigned.
                </p>
              )}
              {Object.entries(result.probabilities)
                .filter(() => result.label !== "Not an Apple")
                .map(([label, p]) => (
                <div className="probability" key={label}>
                  <div>
                    <span>{label}</span>
                    <strong>{(p * 100).toFixed(1)}%</strong>
                  </div>
                  <meter min={0} max={1} value={p} />
                </div>
              ))}
              <dl>
                <dt>Model</dt>
                <dd>{result.model_name}</dd>
                <dt>Version</dt>
                <dd>{result.model_version}</dd>
                <dt>Inference</dt>
                <dd>{result.inference_ms.toFixed(1)} ms</dd>
              </dl>
              <p className="muted">
                {result.label === "Not an Apple"
                  ? "Apple verification failed or the model was uncertain. No apple quality assessment was made. Try a well-lit photo of one apple."
                  : "Fresh/defective classification is made only after apple verification. Probabilities reflect model confidence, not food safety or a commercial grade."}
              </p>
              {storageWarning && (
                <p role="alert" className="error">
                  {storageWarning}
                </p>
              )}
            </div>
          ) : (
            <Empty title="Every result starts with an image">
              Your prediction, class probabilities, and model details will
              appear here after a successful analysis.
            </Empty>
          )}
          <div className="local-note">
            <ShieldCheck size={15} /> Only prediction metadata is saved in this
            browser.
          </div>
        </section>
      </div>
      <div className="scanner-grid future">
        <section className="panel">
          <span className="tag">COMING SOON</span>
          <h3>Defect localization</h3>
          <p>
            Original and annotated image comparison will require a separately
            trained detection or segmentation model. Classification does not
            locate defects.
          </p>
        </section>
        <section className="panel">
          <span className="tag">RESEARCH PLANNED</span>
          <h3>A validated quality score</h3>
          <p>
            A 0–100 grading score requires an independently validated grading
            method. Classification confidence is never used as a quality score.
          </p>
        </section>
      </div>
    </div>
  );
}
function Comparison() {
  const [experiments, setExperiments] = useState<Experiment[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    fetch(import.meta.env.BASE_URL + "experiments/results.json", {
      signal: c.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("Experiment results could not be loaded.");
        return r.json();
      })
      .then((r) => {
        if (!Array.isArray(r.experiments))
          throw new Error("Invalid experiment file.");
        setExperiments(r.experiments);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, []);
  return (
    <div className="page">
      <PageHeading
        label="MEASURE, COMPARE, UNDERSTAND"
        title="Evidence makes the difference."
        description="Compare models on the same held-out test split. Only recorded experiment results appear here."
      />
      <div className="three-cards">
        {[
          "Traditional ML baseline",
          "Custom CNN",
          "MobileNetV2 transfer learning",
        ].map((m, i) => (
          <div className="panel" key={m}>
            <span className="icon-box">
              {i === 0 ? <Layers /> : i === 1 ? <Cpu /> : <Sprout />}
            </span>
            <h3>{m}</h3>
            <p>
              {
                [
                  "OpenCV color histograms and texture features with an SVM.",
                  "A compact convolutional network trained from scratch.",
                  "ImageNet-pretrained features adapted to fresh apple, defective apple, and non-apple classes.",
                ][i]
              }
            </p>
            <span className="tag">
              {experiments.some(
                (e) => e.name === ["baseline", "cnn", "mobilenet"][i],
              )
                ? "RESULTS AVAILABLE"
                : "AWAITING EXPERIMENT"}
            </span>
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!experiments.length ? (
        <section className="panel">
          <Empty title="Research in progress. Results to follow.">
            Train and evaluate the models with the supplied ML scripts, then
            export experiments/results.json into frontend/public/experiments/.
            No accuracy or performance numbers have been invented.
          </Empty>
        </section>
      ) : (
        <>
          <div className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    "Model",
                    "Accuracy",
                    "Precision",
                    "Recall",
                    "F1",
                    "Inference / image",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {experiments.map((e) => (
                  <tr key={e.name}>
                    <td>{e.name}</td>
                    {[e.accuracy, e.precision, e.recall, e.f1].map((v, i) => (
                      <td key={i}>{(v * 100).toFixed(2)}%</td>
                    ))}
                    <td>{e.inference_ms.toFixed(1)} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {experiments.map((e) => (
            <div className="scanner-grid" key={e.name}>
              <section className="panel">
                <h3>{e.name} · Confusion matrix</h3>
                <p>Rows: actual · Columns: predicted · Fresh, Defective, Not an Apple</p>
                <table>
                  <tbody>
                    {e.confusion_matrix.map((row, i) => (
                      <tr key={i}>
                        {row.map((n, j) => (
                          <td key={j}>{n}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p>
                  {e.test_samples} held-out images · Seed {e.seed} · Dataset{" "}
                  {e.dataset}
                </p>
              </section>
              <section className="panel">
                <h3>Training loss</h3>
                {e.history.length ? (
                  <div className="chart">
                    <Suspense fallback={<p>Loading chart…</p>}>
                      <LossChart data={e.history} />
                    </Suspense>
                  </div>
                ) : (
                  <p>Not applicable to the SVM baseline.</p>
                )}
              </section>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
function Analytics({
  history,
  clear,
}: {
  history: Prediction[];
  clear: () => void;
}) {
  const fresh = history.filter((p) => p.label === "Fresh Apple").length;
  const defective = history.filter((p) => p.label === "Rotten or Defective Apple").length;
  const notApple = history.filter((p) => p.label === "Not an Apple").length;
  const counts = [
    { name: "Fresh", count: fresh },
    { name: "Defective", count: defective },
    { name: "Not an Apple", count: notApple },
  ];
  const models = Object.entries(
    history.reduce<Record<string, number>>((acc, p) => {
      const k = p.model_name + " " + p.model_version;
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {}),
  ).map(([name, count]) => ({ name, count }));
  return (
    <div className="page">
      <PageHeading
        label="YOUR LOCAL RESEARCH LOG"
        title="From individual scans to insight."
        description="Explore successful predictions saved on this device. Images are never stored in browser history."
      />
      <div className="status-banner">
        <ShieldCheck size={18} />
        <strong>Stored locally in this browser</strong>
        <span>Up to 500 recent predictions. No cross-device sync.</span>
        {history.length > 0 && (
          <button onClick={clear}>
            <Trash2 size={15} /> Clear history
          </button>
        )}
      </div>
      <div className="stats">
        {(
          [
            ["Images analyzed", history.length, ScanLine],
            ["Fresh apples", fresh, Apple],
            ["Defective apples", defective, Leaf],
            ["Not apples", notApple, X],
            [
              "Average inference",
              history.length
                ? (
                    history.reduce((s, p) => s + p.inference_ms, 0) /
                    history.length
                  ).toFixed(1) + " ms"
                : "—",
              Clock3,
            ],
          ] as [string, string | number, LucideIcon][]
        ).map(([label, value, Icon]) => (
          <div className="panel stat" key={String(label)}>
            {typeof Icon !== "string" && typeof Icon !== "number" && (
              <Icon size={20} />
            )}
            <span>{String(label)}</span>
            <strong>{String(value)}</strong>
          </div>
        ))}
      </div>
      {history.length ? (
        <>
          <div className="scanner-grid">
            {[
              { title: "Classification distribution", data: counts },
              { title: "Model usage", data: models },
            ].map((c) => (
              <section className="panel" key={c.title}>
                <h3>{c.title}</h3>
                <div className="chart">
                  <Suspense fallback={<p>Loading chart…</p>}>
                    <UsageChart data={c.data} />
                  </Suspense>
                </div>
              </section>
            ))}
          </div>
          <section className="panel table-wrap">
            <h3>Recent predictions</h3>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Classification</th>
                  <th>Model</th>
                  <th>Inference</th>
                </tr>
              </thead>
              <tbody>
                {history
                  .slice(-20)
                  .reverse()
                  .map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.timestamp).toLocaleString()}</td>
                      <td>{p.label}</td>
                      <td>
                        {p.model_name} / {p.model_version}
                      </td>
                      <td>{p.inference_ms.toFixed(1)} ms</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        </>
      ) : (
        <section className="panel">
          <Empty title="Your research log is a clean slate.">
            Complete your first real analysis in the AI Scanner to start
            building your local dashboard.
          </Empty>
          <Link className="button secondary" to="AI Scanner">
            Go to scanner <ArrowRight size={17} />
          </Link>
        </section>
      )}
    </div>
  );
}
const methodology = [
  [
    "01",
    "The research question",
    "Can visual features identify an apple before judging visible freshness? The three-class research model recognizes fresh apples, defective apples, or non-apple objects. It is not a food-safety certification.",
  ],
  [
    "02",
    "Dataset selection & EDA",
    "Training uses fresh and rotten apples plus non-apples from verified public repository folders (cigarettes, candies, grocery packages, bananas, oranges). Licenses require independent review for commercial use. Inspect lighting, capture sessions, class balance and label consistency.",
  ],
  [
    "03",
    "Preprocessing & augmentation",
    "Decode as RGB, resize to 224 × 224, and normalize with the documented ImageNet mean and standard deviation. Apply horizontal flips and mild rotation only to training images. The baseline uses color histograms and grayscale texture statistics.",
  ],
  [
    "04",
    "Splits without leakage",
    "Create seeded 70/15/15 train, validation, and test splits stratified by class. Remove exact duplicates across the full dataset and group near-duplicates and images of the same fruit, tree, orchard, or capture session before splitting. Supplied scripts refuse byte-identical duplicates; semantic grouping still needs a dataset audit.",
  ],
  [
    "05",
    "Three complementary approaches",
    "Fit a scaled RBF SVM on OpenCV features, train a small three-block CNN from scratch, and fine-tune the final classifier of a MobileNetV2 backbone initialized with ImageNet weights. Training and inference share preprocessing and class order.",
  ],
  [
    "06",
    "Evaluation & reproducibility",
    "Select neural checkpoints using validation loss, then evaluate once on the untouched test split. Report accuracy and macro precision, recall, F1, confusion matrix, per-image latency, seed, dataset provenance, and training history. Small or nonrepresentative test sets do not establish field performance.",
  ],
  [
    "07",
    "Limitations that matter",
    "The model adds non-apple rejection but cannot guarantee recognizing every unfamiliar object. Unseen cultivars, unusual lighting, and deceptive backgrounds remain risks. Uncertain predictions are rejected; softmax probabilities are not guarantees. Defect locations and formal grades are not provided.",
  ],
  [
    "08",
    "The next research chapter",
    "Measure rejection of new candies, cigarettes and unseen objects from independent sources; audit near-duplicates and orchard images; calibrate uncertainty and collect expert annotations for defect localization.",
  ],
];
function Research() {
  return (
    <div className="page">
      <PageHeading
        label="OPEN METHODS. HONEST LIMITATIONS."
        title="Research you can look inside."
        description="Computer-Vision Grading System for Local Produce Quality — a reproducible path from dataset to evaluation."
      />
      <div className="research-layout">
        <aside className="panel">
          <h3>On this page</h3>
          {methodology.map((m) => (
            <a
              key={m[0]}
              href={"#method-" + m[0]}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("method-" + m[0])
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {m[0]} <span>{m[1]}</span>
            </a>
          ))}
          <a href={repo} target="_blank" rel="noreferrer">
            <Github size={16} /> Source code <ArrowUpRight size={15} />
          </a>
        </aside>
        <div>
          {methodology.map((m) => (
            <article className="method" id={"method-" + m[0]} key={m[0]}>
              <span>{m[0]}</span>
              <div>
                <h2>{m[1]}</h2>
                <p>{m[2]}</p>
              </div>
            </article>
          ))}
          <section className="panel">
            <h3>Browser model and optional API</h3>
            <p>
              The published evaluated MobileNetV2 ONNX checkpoint runs directly
              in your browser without uploading the photo to a server. For a
              separate FastAPI deployment, configure MODEL_PATH and VITE_API_URL
              and allow the frontend origin using ALLOWED_ORIGINS. Classifications
              are research predictions, not food-safety or commercial grading.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
function About() {
  return (
    <div className="page">
      <PageHeading
        label="BUILT WITH CURIOSITY. GROUNDED IN RESEARCH."
        title="A better harvest starts with learning."
        description="ProduceAI connects an academic computer vision project with a carefully considered product experience."
      />
      <div className="scanner-grid">
        <section className="about-feature">
          <span className="brand-icon">
            <Apple size={36} />
          </span>
          <h2>ProduceAI</h2>
          <p>Smarter Fruit Grading Through Computer Vision</p>
          <span className="tag">RESEARCH & DEVELOPMENT</span>
        </section>
        <section className="panel">
          <h2>About the project</h2>
          <dl>
            <dt>Project</dt>
            <dd>Computer-Vision Grading System for Local Produce Quality</dd>
            <dt>Developer</dt>
            <dd>Argishti Mnatsakanyan</dd>
            <dt>Institution</dt>
            <dd>French University in Armenia</dd>
            <dt>Category</dt>
            <dd>
              Artificial Intelligence / Machine Learning / Computer Vision
            </dd>
            <dt>Initial focus</dt>
            <dd>Fresh and defective apple classification</dd>
          </dl>
          <a
            className="button secondary"
            href="https://github.com/mnacakanyanargisti-rgb"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={18} /> Developer on GitHub <ArrowUpRight size={16} />
          </a>
        </section>
      </div>
      <section className="panel about-note">
        <Microscope />
        <div>
          <h3>A portfolio with a research foundation</h3>
          <p>
            Built for university presentations, reproducible experiments, and
            continued exploration. An evaluated MobileNetV2 model is provided for
            on-device apple verification and fresh-versus-rotten classification. Commercial
            quality grades and defect localization still require separate
            labeled training data and independent evaluation.
          </p>
        </div>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
