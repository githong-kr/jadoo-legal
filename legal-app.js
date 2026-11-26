/**
 * 아이자두 (i-JaDo) Public Legal Portal — Live Supabase Version History Loader
 * Automatically fetches all published versions (`announced`, `active`, `archived`)
 * from `public.legal_documents` so the public web page and in-app modal share one SSOT.
 */
(function () {
  const SUPABASE_URL = "https://hcfsofzdldifycmcspnp.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_MRJYRaPzq1BQcuxNR8aItA_ISAfW3_t";

  const STATUS_KO = {
    announced: "시행 예정",
    active: "현행",
    archived: "이전 버전",
  };

  function formatKoDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}년 ${m}월 ${day}일`;
  }

  function renderDoc(doc) {
    const titleEl = document.getElementById("doc-title");
    const metaEl = document.getElementById("doc-meta");
    const summaryWrap = document.getElementById("doc-summary-wrap");
    const summaryTitle = document.getElementById("doc-summary-title");
    const summaryBody = document.getElementById("doc-summary-body");
    const bodyEl = document.getElementById("doc-body");

    if (titleEl) titleEl.textContent = doc.title_ko;
    if (metaEl) {
      metaEl.textContent = `버전 v${doc.version} (${STATUS_KO[doc.status] || doc.status}) · 공고일 ${formatKoDate(doc.announced_at)} · 시행일 ${formatKoDate(doc.effective_at)}`;
    }
    if (summaryWrap && summaryTitle && summaryBody) {
      if (doc.summary_of_changes_ko && doc.summary_of_changes_ko.trim()) {
        summaryWrap.style.display = "block";
        summaryTitle.textContent = `v${doc.version} 주요 개정 안내`;
        summaryBody.textContent = doc.summary_of_changes_ko;
      } else {
        summaryWrap.style.display = "none";
      }
    }
    if (bodyEl) {
      bodyEl.textContent = doc.body_md;
    }
  }

  async function initLegalPage() {
    const docType = document.body.getAttribute("data-legal-doc-type");
    if (!docType) return;

    const selectEl = document.getElementById("version-select");
    const syncNoteEl = document.getElementById("sync-note");

    try {
      const url = `${SUPABASE_URL}/rest/v1/legal_documents?doc_type=eq.${encodeURIComponent(docType)}&status=in.(announced,active,archived)&order=effective_at.desc,created_at.desc`;
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const docs = await res.json();
      if (!Array.isArray(docs) || docs.length === 0) return;

      const params = new URLSearchParams(window.location.search);
      const requestedVer = params.get("v");
      const defaultDoc =
        (requestedVer && docs.find((d) => d.version === requestedVer)) ||
        docs.find((d) => d.status === "active") ||
        docs[0];

      if (selectEl) {
        selectEl.innerHTML = "";
        docs.forEach((d) => {
          const opt = document.createElement("option");
          opt.value = d.version;
          opt.textContent = `v${d.version} (${STATUS_KO[d.status] || d.status}) · ${formatKoDate(d.effective_at)}`;
          if (d.version === defaultDoc.version) opt.selected = true;
          selectEl.appendChild(opt);
        });
        selectEl.addEventListener("change", (ev) => {
          const chosen = docs.find((d) => d.version === ev.target.value);
          if (chosen) {
            renderDoc(chosen);
            const nextUrl = new URL(window.location.href);
            nextUrl.searchParams.set("v", chosen.version);
            window.history.replaceState({}, "", nextUrl.toString());
          }
        });
      }

      renderDoc(defaultDoc);
      if (syncNoteEl) {
        syncNoteEl.textContent = `실시간 동기화됨 · 총 ${docs.length}개 버전 열람 가능`;
      }
    } catch {
      // Static embedded v1.0.0 fallback remains visible cleanly
      if (syncNoteEl) {
        syncNoteEl.textContent = "기본 게시본 표시 중 (v1.0.0)";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", initLegalPage);
})();
