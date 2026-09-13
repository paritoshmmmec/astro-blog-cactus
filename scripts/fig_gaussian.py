"""Figures for 'Why Everything Wants to Be Gaussian' (paritosh.dev palette)."""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from math import lgamma, pi, exp, log


def _norm_pdf(z):
    return np.exp(-np.asarray(z, dtype=float) ** 2 / 2.0) / np.sqrt(2.0 * pi)


def _chi_pdf(r, k):
    """Chi distribution pdf without scipy: log-pdf via Gamma, then exponentiate."""
    r = np.asarray(r, dtype=float)
    log_norm = (k / 2.0) * log(2.0) - (k / 2.0) * log(2.0) - lgamma(k / 2.0)
    # chi(k) pdf = r^(k-1) e^{-r^2/2} / (2^{k/2 - 1} Gamma(k/2))
    log_pdf = (k - 1) * np.log(np.maximum(r, 1e-300)) - r * r / 2.0 \
        - (k / 2.0 - 1.0) * log(2.0) - lgamma(k / 2.0)
    return np.exp(log_pdf)

# Site palette (src/styles/global.css, .theme-sleek)
BG = "#F7F6F2"      # --color-bg-body
INK = "#262626"     # --color-text-body
HEAD = "#111827"    # --color-text-heading
MUTED = "#6B7280"   # --color-text-muted
PRIMARY = "#30578A" # --color-primary-main
LIGHT = "#A2BEE3"   # dark-mode primary, used as a soft fill
BORDER = "#DED9CE"  # --color-border-code

plt.rcParams.update({
    "figure.facecolor": BG,
    "axes.facecolor": BG,
    "savefig.facecolor": BG,
    "font.family": "serif",
    "font.serif": ["Palatino", "Iowan Old Style", "Palatino Linotype", "DejaVu Serif"],
    "text.color": INK,
    "axes.edgecolor": MUTED,
    "axes.labelcolor": INK,
    "xtick.color": INK,
    "ytick.color": INK,
    "axes.linewidth": 0.8,
    "axes.titlesize": 11.5,
    "axes.titlecolor": HEAD,
    "axes.labelsize": 10,
    "xtick.labelsize": 9,
    "ytick.labelsize": 9,
})


def style(ax):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.grid(True, color=BORDER, linewidth=0.7, alpha=0.9)
    ax.set_axisbelow(True)


# ---------------------------------------------------------------- fig 1
# The bell (d=1 pdf) vs the bubble (radial mass at d=1000).
fig, axes = plt.subplots(1, 2, figsize=(9.6, 3.4))

x = np.linspace(-4, 4, 600)
axes[0].plot(x, _norm_pdf(x), color=PRIMARY, lw=2.2)
axes[0].fill_between(x, _norm_pdf(x), color=LIGHT, alpha=0.45)
axes[0].set_title("d = 1: the bell (the shadow you know)")
axes[0].set_xlabel("value")
axes[0].set_ylabel("probability density")
axes[0].set_ylim(0, 0.46)
style(axes[0])

r = np.linspace(20, 44, 900)
d = 1000
# radial pdf of a standard Gaussian in d dims: chi distribution, k = d
rad = _chi_pdf(r, d)
axes[1].plot(r, rad, color=PRIMARY, lw=2.2)
axes[1].fill_between(r, rad, color=LIGHT, alpha=0.45)
axes[1].axvline(np.sqrt(d - 1), color=MUTED, lw=1.0, ls="--")
axes[1].annotate("radius ≈ √d ≈ 31.6", xy=(np.sqrt(d - 1), rad.max()),
                 xytext=(np.sqrt(d - 1) + 1.6, rad.max() * 0.86),
                 color=HEAD, fontsize=10,
                 arrowprops=dict(arrowstyle="-", color=MUTED, lw=0.8))
axes[1].set_title("d = 1000: the bubble (where the mass lives)")
axes[1].set_xlabel("distance from the origin")
axes[1].set_ylabel("")
axes[1].set_yticks([])
style(axes[1])

fig.tight_layout()
fig.savefig("public/images/gaussian-bell-vs-bubble.png", dpi=200)
plt.close(fig)

# ---------------------------------------------------------------- fig 2
# CLT: sums of uniforms converge to the bell.
rng = np.random.default_rng(7)
ks = [1, 2, 4, 12]
fig, axes = plt.subplots(1, 4, figsize=(10.4, 2.9), sharey=True)
for ax, k in zip(axes, ks):
    s = rng.random((300_000, k)).sum(axis=1)
    s = (s - k / 2) / np.sqrt(k / 12)  # standardize
    ax.hist(s, bins=90, range=(-3.4, 3.4), density=True,
            color=LIGHT, edgecolor=BG, linewidth=0.25)
    z = np.linspace(-3.4, 3.4, 400)
    ax.plot(z, _norm_pdf(z), color=PRIMARY, lw=2.0)
    ax.set_title(f"sum of {k}" + (" draw" if k == 1 else " draws"))
    ax.set_xlabel("standardized sum")
    style(ax)
axes[0].set_ylabel("density")
fig.tight_layout()
fig.savefig("public/images/gaussian-clt-sums.png", dpi=200)
plt.close(fig)

# ---------------------------------------------------------------- fig 3
# Cosine concentration: |cos| between random unit vectors, various d.
fig, axes = plt.subplots(1, 4, figsize=(10.4, 2.9), sharey=True)
for ax, d in zip(axes, [2, 10, 100, 1000]):
    a = rng.standard_normal((40_000, d))
    b = rng.standard_normal((40_000, d))
    a /= np.linalg.norm(a, axis=1, keepdims=True)
    b /= np.linalg.norm(b, axis=1, keepdims=True)
    cos = np.sum(a * b, axis=1)
    ax.hist(cos, bins=80, range=(-1, 1), density=True,
            color=LIGHT, edgecolor=BG, linewidth=0.25)
    ax.axvline(0, color=MUTED, lw=1.0, ls="--")
    ax.set_title(f"d = {d}")
    ax.set_xlabel("cos(a, b)")
    ax.set_xlim(-1, 1)
    style(ax)
axes[0].set_ylabel("density")
fig.tight_layout()
fig.savefig("public/images/gaussian-cosine-concentration.png", dpi=200)
plt.close(fig)

print("figures written")
