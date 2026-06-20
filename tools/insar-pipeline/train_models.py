"""Train the learned TailWatch methods on the labelled forward dataset, export to ONNX, and emit the
committed web artifacts + the honest learned-vs-classical benchmark.

Two convolutional models (the SOTA core; classical velocity/inverse-velocity are the BASELINES they beat):
  • AE  — a 2-D convolutional AUTOENCODER trained ONLY on NORMAL velocity patches; the reconstruction error
          is an unsupervised spatial ANOMALY score (flags deformation the velocity map alone misses).
  • CNN — a 1-D convolutional CLASSIFIER on per-pixel displacement time-series → 6 deformation classes,
          with Grad-CAM-style temporal saliency.
Train on scenes 1–16, evaluate on HELD-OUT scenes 17–20 (split by scene ⇒ no spatial leakage). Demo scene
17 is exported for the web. Everything deterministic (fixed seeds).

Refs: Anantrasirichai et al. 2018 (deep learning of volcanic deformation, RSE); Zhang et al. 2017 (WDCNN
1-D CNN); Selvaraju et al. 2017 (Grad-CAM); McInnes et al. 2018 (UMAP). ONNX → onnxruntime-web in-browser.

Run:  python train_models.py
"""
from __future__ import annotations
import os, json, numpy as np, torch, torch.nn as nn
from sbas import load_scene, decompose_up, velocity
from forward import build_scene

torch.manual_seed(0); np.random.seed(0)
HERE = os.path.dirname(__file__)
SCENES = os.path.join(HERE, "artifacts", "scenes")
OUT = os.path.abspath(os.path.join(HERE, "..", "..", "public"))   # served by Vite
os.makedirs(OUT, exist_ok=True)
TRAIN = list(range(1, 17)); HELD = [17, 18, 19, 20]; DEMO = 17
VEL_SCALE = 60.0          # mm/yr normaliser (the web replicates this)
PATCH = 16
CLASSES = ["stable", "linear", "accelerating", "seasonal", "step", "decorrelated"]
NORMAL = {0, 3, 5}        # stable, seasonal, decorrelated = "normal" for the AE; failure = {1 linear,2 accel,4 step}
FAILURE = {1, 2, 4}


# ---------- models ----------
class CNN1D(nn.Module):
    def __init__(self, n_cls=6):
        super().__init__()
        self.c1 = nn.Conv1d(1, 16, 7, padding=3); self.c2 = nn.Conv1d(16, 32, 5, padding=2); self.c3 = nn.Conv1d(32, 64, 3, padding=1)
        self.pool = nn.MaxPool1d(2); self.fc = nn.Linear(64, n_cls)
    def features(self, x):
        x = self.pool(torch.relu(self.c1(x))); x = self.pool(torch.relu(self.c2(x))); x = torch.relu(self.c3(x)); return x
    def forward(self, x):
        f = self.features(x); g = torch.mean(f, dim=2); return self.fc(g)


class ConvAE(nn.Module):
    def __init__(self, lat=16):
        super().__init__()
        self.enc = nn.Sequential(nn.Conv2d(1, 16, 3, 2, 1), nn.ReLU(), nn.Conv2d(16, 32, 3, 2, 1), nn.ReLU(), nn.Flatten(), nn.Linear(32 * 4 * 4, lat))
        self.dec = nn.Sequential(nn.Linear(lat, 32 * 4 * 4), nn.ReLU(), nn.Unflatten(1, (32, 4, 4)),
                                 nn.ConvTranspose2d(32, 16, 3, 2, 1, output_padding=1), nn.ReLU(),
                                 nn.ConvTranspose2d(16, 1, 3, 2, 1, output_padding=1))
    def encode(self, x): return self.enc(x)
    def forward(self, x): return self.dec(self.enc(x))


# ---------- data prep ----------
def scene_fields(idx):
    s = load_scene(os.path.join(SCENES, f"s{idx}.h5"))
    up = decompose_up(s["cum_asc"], s["cum_desc"])          # (nEp,H,W)
    vel = velocity(up, s["days"])                            # (H,W)
    return s, up, vel


def pixel_series_dataset(idxs, per_class=1100):
    X, Y = [], []
    for i in idxs:
        s, up, _ = scene_fields(i)
        nEp, H, W = up.shape; series = up.reshape(nEp, -1).T     # (HW, nEp)
        zone = s["zone"].ravel()
        for c in range(6):
            px = np.where(zone == c)[0]
            if len(px) == 0: continue
            take = np.random.choice(px, min(per_class, len(px)), replace=False)
            X.append(series[take]); Y.append(np.full(len(take), c))
    X = np.concatenate(X).astype(np.float32); Y = np.concatenate(Y).astype(np.int64)
    mu = X.mean(1, keepdims=True); sd = X.std(1, keepdims=True) + 1e-6
    return (X - mu) / sd, Y


def velocity_patches(vel, stride=4):
    H, W = vel.shape; v = (vel / VEL_SCALE).astype(np.float32)
    patches, centers = [], []
    for y in range(0, H - PATCH + 1, stride):
        for x in range(0, W - PATCH + 1, stride):
            patches.append(v[y:y + PATCH, x:x + PATCH]); centers.append((y + PATCH // 2, x + PATCH // 2))
    return np.array(patches)[:, None], centers   # (N,1,16,16)


# ---------- train CNN ----------
def train_cnn():
    Xtr, Ytr = pixel_series_dataset(TRAIN)
    net = CNN1D(); opt = torch.optim.Adam(net.parameters(), 1e-3); lossf = nn.CrossEntropyLoss()
    Xt = torch.tensor(Xtr[:, None]); Yt = torch.tensor(Ytr)
    n = len(Xt); bs = 256
    for ep in range(30):
        perm = torch.randperm(n); tot = 0
        for b in range(0, n, bs):
            idx = perm[b:b + bs]; opt.zero_grad(); out = net(Xt[idx]); l = lossf(out, Yt[idx]); l.backward(); opt.step(); tot += l.item() * len(idx)
        if ep % 3 == 0: print(f"  cnn ep{ep} loss {tot/n:.3f}")
    return net


# ---------- train AE ----------
def train_ae():
    pats = []
    for i in TRAIN:
        _, _, vel = scene_fields(i)
        s = load_scene(os.path.join(SCENES, f"s{i}.h5")); zone = s["zone"]
        P, centers = velocity_patches(vel, stride=4)
        for p, (cy, cx) in zip(P, centers):
            if int(zone[cy, cx]) in NORMAL: pats.append(p)     # NORMAL-only training
    Xtr = torch.tensor(np.array(pats))
    net = ConvAE(); opt = torch.optim.Adam(net.parameters(), 1e-3); lossf = nn.MSELoss()
    n = len(Xtr); bs = 128
    # DENOISING autoencoder (Vincent et al. 2008): corrupt the input, reconstruct the clean patch. With a
    # tight bottleneck + NORMAL-only training this resists the identity shortcut (a plain AE can reconstruct
    # anomalies too; bottleneck alone is insufficient — Bouman & Heskes 2025), so anomalies reconstruct poorly.
    for ep in range(24):
        perm = torch.randperm(n); tot = 0
        for b in range(0, n, bs):
            idx = perm[b:b + bs]; clean = Xtr[idx]
            noisy = clean + 0.10 * torch.randn_like(clean)
            opt.zero_grad(); rec = net(noisy); l = lossf(rec, clean); l.backward(); opt.step(); tot += l.item() * len(idx)
        if ep % 6 == 0: print(f"  ae  ep{ep} loss {tot/n:.4f}")
    return net


# ---------- anomaly map from the AE (per-pixel recon error of its centred patch) ----------
def anomaly_map(net, vel):
    H, W = vel.shape; v = (vel / VEL_SCALE).astype(np.float32)
    P, centers = velocity_patches(vel, stride=2)
    with torch.no_grad():
        rec = net(torch.tensor(P)).numpy()
    err = ((rec - P) ** 2).mean((1, 2, 3))
    amap = np.zeros((H, W)); cnt = np.zeros((H, W))
    for e, (cy, cx) in zip(err, centers):
        amap[cy, cx] += e; cnt[cy, cx] += 1
    amap = np.where(cnt > 0, amap / np.maximum(cnt, 1), 0)
    # fill unscored border pixels by nearest scored value (simple dilation)
    from scipy.ndimage import grey_dilation
    m = amap.copy()
    for _ in range(PATCH // 2):
        d = grey_dilation(m, size=3); m = np.where(m > 0, m, d)
    return m


def roc(scores, pos):
    thr = np.unique(scores)[::-1]; P = pos.sum(); N = (~pos).sum()
    fpr, tpr = [0.0], [0.0]
    for t in thr[::max(1, len(thr) // 200)]:
        pred = scores >= t; tpr.append((pred & pos).sum() / max(P, 1)); fpr.append((pred & ~pos).sum() / max(N, 1))
    fpr.append(1.0); tpr.append(1.0)
    order = np.argsort(fpr); fpr = np.array(fpr)[order]; tpr = np.array(tpr)[order]
    auc = float(np.trapezoid(tpr, fpr))
    return fpr.tolist(), tpr.tolist(), float(auc)


def main():
    print("training CNN classifier…"); cnn = train_cnn()
    print("training conv-AE…"); ae = train_ae()

    # --- held-out evaluation ---
    from sklearn.metrics import f1_score, confusion_matrix
    yP, yT, ae_scores, vel_scores, is_fail = [], [], [], [], []
    for i in HELD:
        s, up, vel = scene_fields(i); zone = s["zone"]
        nEp, H, W = up.shape; series = up.reshape(nEp, -1).T
        mu = series.mean(1, keepdims=True); sd = series.std(1, keepdims=True) + 1e-6
        with torch.no_grad():
            pred = cnn(torch.tensor(((series - mu) / sd)[:, None].astype(np.float32))).argmax(1).numpy()
        yP.append(pred); yT.append(zone.ravel())
        amap = anomaly_map(ae, vel)
        ae_scores.append(amap.ravel()); vel_scores.append(np.abs(vel).ravel())
        is_fail.append(np.isin(zone.ravel(), list(FAILURE)))
    yP = np.concatenate(yP); yT = np.concatenate(yT)
    macroF1 = float(f1_score(yT, yP, average="macro"))
    conf = confusion_matrix(yT, yP, labels=list(range(6))).tolist()
    aeS = np.concatenate(ae_scores); velS = np.concatenate(vel_scores); fail = np.concatenate(is_fail)
    ae_fpr, ae_tpr, ae_auc = roc(aeS, fail)
    v_fpr, v_tpr, v_auc = roc(velS, fail)
    print(f"held-out: macro-F1 {macroF1:.3f} | AE-anomaly AUC {ae_auc:.3f} vs classical |v| AUC {v_auc:.3f}")

    # --- export ONNX ---
    cnn.eval(); ae.eval()
    torch.onnx.export(cnn, torch.zeros(1, 1, 60), os.path.join(OUT, "cnn.onnx"), dynamo=False,
                      input_names=["series"], output_names=["logits"], dynamic_axes={"series": {0: "n"}, "logits": {0: "n"}}, opset_version=17)
    torch.onnx.export(ae, torch.zeros(1, 1, PATCH, PATCH), os.path.join(OUT, "ae.onnx"), dynamo=False,
                      input_names=["patch"], output_names=["recon"], dynamic_axes={"patch": {0: "n"}, "recon": {0: "n"}}, opset_version=17)

    # --- multi-case demo artifacts (distinct CONFIGURABLE scenarios; each view reacts to the case) ---
    from sbas import SIN
    import umap
    CUMSCALE = 10.0
    CASES = [
        dict(id="accel",    en="Accelerating dam → collapse", es="Presa acelerando → colapso", regime="accelerating", seed=101, sev=1.0),
        dict(id="stable",   en="Stable control",                  es="Control estable",                regime="stable",       seed=102, sev=1.0),
        dict(id="seasonal", en="Seasonal site",                   es="Sitio estacional",               regime="seasonal",     seed=103, sev=1.0),
        dict(id="step",     en="Step after rain",                 es="Escalón tras lluvia",        regime="step",         seed=104, sev=1.0),
        dict(id="linear",   en="Steady linear creep",             es="Creep lineal estable",           regime="linear",       seed=105, sev=1.2),
    ]
    case_meta = []
    daysList = None
    for cd in CASES:
        sc = build_scene(W=160, H=120, n_ep=60, seed=cd["seed"], dam_regime=cd["regime"], dam_sev=cd["sev"])
        asc, desc, days, zone = sc["cum_asc"], sc["cum_desc"], sc["days"], sc["zone"]
        daysList = days.tolist()
        up = decompose_up(asc, desc); east = (asc - desc) / (2 * SIN)
        vU, vEa, vAs, vDe = velocity(up, days), velocity(east, days), velocity(asc, days), velocity(desc, days)
        amap = anomaly_map(ae, vU)
        nEp, H, W = up.shape
        series = up.reshape(nEp, -1).T; mu = series.mean(1, keepdims=True); sd = series.std(1, keepdims=True) + 1e-6
        with torch.no_grad():
            classMap = cnn(torch.tensor(((series - mu) / sd)[:, None].astype(np.float32))).argmax(1).numpy().reshape(H, W)
        coh = sc["coh"].mean(0)
        P, centers = velocity_patches(vU, stride=6)
        with torch.no_grad():
            lat = ae.encode(torch.tensor(P)).numpy()
        emb = umap.UMAP(n_neighbors=15, min_dist=0.1, random_state=0).fit_transform(lat)
        latent = [{"x": round(float(emb[k, 0]), 3), "y": round(float(emb[k, 1]), 3), "cls": int(zone[cy, cx])} for k, (cy, cx) in enumerate(centers)]
        maps = [vU, vEa, vAs, vDe, amap, classMap, coh, zone]
        buf = b"".join(m.astype(np.float32).ravel().tobytes() for m in maps)
        buf += np.clip(up * CUMSCALE, -32760, 32760).astype(np.int16).ravel().tobytes()
        with open(os.path.join(OUT, f"tw-{cd['id']}.bin"), "wb") as f:
            f.write(buf)
        case_meta.append(dict(id=cd["id"], en=cd["en"], es=cd["es"], regime=cd["regime"], latent=latent))
        print(f"  case {cd['id']}: {len(buf)//1024} KB")

    manifest = dict(W=160, H=120, nEp=60, days=daysList, classes=CLASSES, cumScale=CUMSCALE, velScale=VEL_SCALE, patch=PATCH,
                    components=["up", "east", "asc", "desc"],
                    bin=dict(order=["velUp", "velEast", "velAsc", "velDesc", "anomaly", "classMap", "coh", "zone", "cumUp"], dtype="f32x8+i16cum"),
                    cases=case_meta,
                    benchmark=dict(macroF1=round(macroF1, 3), aeAuc=round(ae_auc, 3), velAuc=round(v_auc, 3),
                                   aeRoc=dict(fpr=[round(x, 4) for x in ae_fpr], tpr=[round(x, 4) for x in ae_tpr]),
                                   velRoc=dict(fpr=[round(x, 4) for x in v_fpr], tpr=[round(x, 4) for x in v_tpr]),
                                   confusion=conf, heldOut=HELD, trainScenes=len(TRAIN)))
    with open(os.path.join(OUT, "tw-cases.json"), "w") as f:
        json.dump(manifest, f)
    print(f"wrote {len(CASES)} cases + tw-cases.json, ae.onnx, cnn.onnx")


if __name__ == "__main__":
    main()
