import React, { useState, useEffect, useRef } from "react";

// 👑 辰妍國際專屬 API 金鑰（相冊校稿 Apps Script）
const API_URL = "https://script.google.com/macros/s/AKfycbwvYeDb8KyJid5pxPqEn1S-8TtTnZRMPbrxxqzw4jaryUGd0HRuiRpjX_nxUcWfKv6gHw/exec";

// ==========================================
// ⚙️ 系統設定（V2）
// ==========================================
const LINE_OA_ID = "@tinycktw";
const DRAFT_PREFIX = "album-proof-draft-";
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 草稿保留 30 天
const BACKUP_WAIT_MS = 8000;                   // 送出時等待雲端同步的上限
const LINE_SUMMARY_LIMIT = 500;                // LINE 預填摘要字數上限（避免網址過長開不了）
const USE_FAST_CDN = true;                     // 圖片優先走 Google lh3 CDN，失敗自動退回原網址
// V2.2：裁切線位置 true = 畫在作品外圍（不遮擋畫面）；false = 依比例內縮（舊版）
const CROP_LINE_OUTSIDE = true;
const CROP_OUT = "-7px";

// ==========================================
// 🖼️ V2.3 周邊商品顯示規則（方案 A：依檔名判斷，可持續擴充）
// 給客人的檔案＝給廠商的印刷檔；部分品項的外圈是包邊用，顯示時往內裁掉，
// 讓客人看到的是「掛上牆後的樣子」。裁切線樣式與一般品項一致。
// ==========================================
const MERCH_DPI = 300; // 印刷檔解析度（mm → 像素換算用）
const MERCH_TRIM_RULES: { name: string; match: RegExp; exclude?: RegExp; trimMm: { top: number; bottom: number; left: number; right: number } }[] = [
  // 無框畫：檔名有「蠶絲膜」→ 照原樣顯示；沒有 → 上下左右各內縮 48mm
  { name: "無框畫（無蠶絲膜）", match: /無框畫/, exclude: /蠶絲膜/, trimMm: { top: 48, bottom: 48, left: 48, right: 48 } },
  // 新增廠商範例：{ name: "某廠 A4 框", match: /A4框/, trimMm: { top: 20, bottom: 20, left: 20, right: 20 } },
];
const getMerchTrimRule = (name: string) =>
  MERCH_TRIM_RULES.find(r => r.match.test(name) && !(r.exclude && r.exclude.test(name))) || null;

// ==========================================
// 🛠️ 核心樣式（與 V1 完全相同）
// ==========================================
const GLOBAL_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }

  body, html {
    background-color: #F4F7F6;
    color: #333333;
    width: 100%;
    min-height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    user-select: none;
  }

  .admin-viewport { position: fixed; inset: 0; display: flex; justify-content: center; align-items: center; background: #F4F7F6; z-index: 1000; padding: 20px; }
  .admin-box { width: 100%; max-width: 500px; padding: 50px 40px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.06); text-align: center; border: 1px solid #E5E9EA; }
  .brand-logo-text { font-family: "Montserrat", sans-serif; font-weight: 600; font-size: 2.2rem; letter-spacing: 5px; color: #187880; margin-bottom: 8px; }
  .brand-subtitle { font-size: 0.75rem; letter-spacing: 3px; color: #888; margin-bottom: 25px; text-transform: uppercase; }

  .input-group { margin-bottom: 20px; text-align: left; }
  .input-label { display: block; color: #555; font-size: 0.85rem; margin-bottom: 8px; font-weight: 600; letter-spacing: 1px; }
  .drive-input { width: 100%; padding: 14px 15px; background: #FAFAFA; border: 1px solid #DDDDDD; color: #333333; border-radius: 6px; outline: none; font-size: 0.95rem; transition: all 0.2s ease; }
  .drive-input::placeholder { color: #aaa; }
  .drive-input:focus { background: #ffffff; border-color: #187880; box-shadow: 0 0 0 3px rgba(24, 120, 128, 0.1); }

  .btn-generate { width: 100%; padding: 14px; background: #187880; color: #ffffff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 1rem; letter-spacing: 1px; }
  .btn-generate:hover:not(:disabled) { background: #136066; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(24, 120, 128, 0.2); }
  .btn-generate:disabled { background: #e0e0e0; color: #999; cursor: not-allowed; }
  .btn-reset { padding: 14px; background: transparent; color: #666; border: 1px solid #ccc; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 0.95rem; letter-spacing: 1px; white-space: nowrap; }
  .btn-reset:hover { color: #187880; border-color: #187880; background: rgba(24, 120, 128, 0.05); }

  .result-box { margin-top: 25px; padding: 20px; background: #F9FAFB; border: 1px solid #E5E9EA; border-left: 4px solid #187880; border-radius: 6px; animation: fadeIn 0.4s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  .client-link-text { word-break: break-all; color: #187880; font-size: 0.95rem; font-weight: 500; background: #ffffff; padding: 12px; border-radius: 4px; margin-bottom: 15px; user-select: all; letter-spacing: 0.5px; border: 1px solid #E5E9EA; }
  .btn-copy { flex: 1; padding: 12px; background: #187880; color: white; border: none; border-radius: 4px; font-weight: 500; cursor: pointer; transition: 0.2s; }
  .btn-copy:hover { background: #136066; }
  .btn-preview { flex: 1; padding: 12px; background: transparent; color: #187880; border: 1px solid #187880; border-radius: 4px; font-weight: 500; cursor: pointer; transition: 0.2s; display: inline-flex; justify-content: center; align-items: center; text-decoration: none;}
  .btn-preview:hover { background: rgba(24, 120, 128, 0.05); }

  .app-grid-shell {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100vh;
    background: #F4F7F6;
  }

  .header-bar {
    position: sticky;
    top: 0;
    z-index: 500;
    padding: 15px 30px;
    background: #ffffff;
    border-bottom: 1px solid #E5E9EA;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  }
  .brand-logo-text-small { font-family: "Montserrat", sans-serif; font-weight: 700; font-size: 1.2rem; letter-spacing: 2px; color: #187880; white-space: nowrap; }

  .view-tabs { display: flex; gap: 10px; overflow-x: auto; flex: 1; justify-content: center; padding-bottom: 2px; }
  .view-tabs::-webkit-scrollbar { height: 0px; }
  .tab-btn { background: #ffffff; border: 1px solid #ddd; color: #666; padding: 8px 20px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .tab-btn:hover { border-color: #187880; color: #187880; }
  .tab-btn.active { background: rgba(24, 120, 128, 0.08); border-color: #187880; color: #187880; }

  .stage-center-area {
    flex: 1;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    padding: 50px 20px 40px 20px;
    perspective: 2500px;
  }

  .stage-top-indicator {
    position: absolute;
    top: 15px;
    left: 0;
    width: 100%;
    text-align: center;
    color: #187880;
    font-weight: 700;
    font-size: 1.05rem;
    letter-spacing: 1px;
    z-index: 100;
    padding: 0 60px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-btn-floating { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(4px); color: #187880; border: 1px solid #187880; width: 44px; height: 44px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 1.2rem; font-weight: 300; cursor: pointer; transition: all 0.2s ease; z-index: 150; box-shadow: 0 4px 10px rgba(0,0,0,0.05);}
  .nav-btn-floating:hover:not(:disabled) { background: #187880; color: #fff; transform: translateY(-50%) scale(1.05); box-shadow: 0 6px 15px rgba(24, 120, 128, 0.2);}
  .nav-btn-floating:disabled { opacity: 0; pointer-events: none; }
  .nav-left { left: 40px; }
  .nav-right { right: 40px; }

  .album-layout-wrapper { position: relative; display: flex; flex-direction: column; align-items: flex-end; width: 86vw; transition: transform 0.8s cubic-bezier(0.645,0.045,0.355,1); }
  .album-book-container { position: relative; display: flex; width: 100%; box-shadow: 0 15px 40px rgba(0,0,0,0.12); background: #fff; border-radius: 2px; transition: background 0.3s, box-shadow 0.3s; }
  .album-page-base { position: absolute; top: 0; bottom: 0; width: 50%; overflow: hidden; display: flex; justify-content: center; align-items: center; transition: opacity 0.3s; }
  .base-left { left: 0; border-radius: 3px 0 0 3px; }
  .base-right { right: 0; border-radius: 0 3px 3px 0; }

  .album-book-container.is-front-cover { background: transparent; box-shadow: none; }
  .album-book-container.is-front-cover .base-left { opacity: 0; pointer-events: none; }
  .album-book-container.is-front-cover .base-right { background: #fff; box-shadow: 0 15px 40px rgba(0,0,0,0.12); border-radius: 4px; }

  .album-book-container.is-back-cover { background: transparent; box-shadow: none; }
  .album-book-container.is-back-cover .base-right { opacity: 0; pointer-events: none; }
  .album-book-container.is-back-cover .base-left { background: #fff; box-shadow: 0 15px 40px rgba(0,0,0,0.12); border-radius: 4px; }

  .merch-layout-wrapper { position: relative; display: flex; flex-direction: column; align-items: flex-end; width: 86vw; max-width: 800px; transition: transform 0.4s ease; }
  .merch-image-box { position: relative; width: 100%; background: #ffffff; padding: 30px; display: flex; justify-content: center; align-items: center; border-radius: 8px; box-shadow: 0 15px 40px rgba(0,0,0,0.08); border: 1px solid #eee; }
  .merch-img-wrapper { position: relative; display: inline-block; max-width: 100%; max-height: 55vh; }
  .merch-img-wrapper img { display: block; max-width: 100%; max-height: 55vh; object-fit: contain; border-radius: 2px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); }

  .crop-toggle-btn-inline { margin-top: 15px; background: #ffffff; color: #187880; border: 1px solid #187880; padding: 8px 18px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .crop-toggle-btn-inline:hover { background: rgba(24, 120, 128, 0.05); }
  .crop-toggle-btn-inline.active { background: #ff4d4f; color: #fff; border-color: #ff4d4f; }

  /* V2.1 旋轉相冊 */
  .album-tool-row { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
  .album-rotate-stage { position: relative; width: 100%; touch-action: pinch-zoom; }
  .album-book-container.is-rotated { position: absolute; top: 50%; left: 50%; perspective: 2500px; }
  .nav-btn-floating.nav-up { left: auto; right: 40px; top: calc(50% - 28px); }
  .nav-btn-floating.nav-down { left: auto; right: 40px; top: calc(50% + 28px); }

  .crop-line-overlay {
    position: absolute;
    border: 2px dashed rgba(255, 77, 79, 0.9);
    z-index: 500;
    pointer-events: none;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 6px;
    transition: opacity 0.3s;
    transform: translateZ(0);
  }

  .crop-warning-text { background: rgba(255, 77, 79, 0.95); color: #fff; font-size: 0.65rem; padding: 2px 5px; border-radius: 3px; font-weight: 500; letter-spacing: 1px; pointer-events: auto; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
  /* V2.2：裁切線畫在作品外圍，標籤移到框外，不遮擋畫面 */
  .crop-line-overlay.outside { padding: 0; }
  .crop-line-overlay.outside .crop-warning-text { position: absolute; top: -22px; right: -2px; white-space: nowrap; }

  /* V2.2：剩餘頁數提醒（同精修校稿） */
  .nav-btn-floating.has-more { animation: nudge 1.6s ease-in-out infinite; }
  @keyframes nudge {
    0%, 100% { box-shadow: 0 4px 10px rgba(0,0,0,0.05), 0 0 0 0 rgba(24,120,128,0.45); }
    50% { box-shadow: 0 4px 10px rgba(0,0,0,0.05), 0 0 0 10px rgba(24,120,128,0); }
  }
  .more-badge { position: absolute; top: -6px; right: -6px; background: #e74c3c; color: #fff; font-size: 0.68rem; font-weight: 700; min-width: 20px; height: 20px; border-radius: 10px; padding: 0 5px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(231,76,60,0.4); }
  .page-remaining { margin-right: auto; font-size: 0.85rem; color: #e74c3c; font-weight: 600; }
  .page-remaining.last { color: #187880; }

  .album-flipper { position: absolute; top: 0; bottom: 0; width: 50%; transform-style: preserve-3d; z-index: 30; transition: transform 0.8s cubic-bezier(0.645,0.045,0.355,1); }
  .flipping-next { right: 0; transform-origin: left center; }
  .flipping-prev { left: 0; transform-origin: right center; }
  .flipping-next.active { transform: rotateY(-180deg); }
  .flipping-prev.active { transform: rotateY(180deg); }
  .flipper-face { position: absolute; inset: 0; backface-visibility: hidden; background: #fff; overflow: hidden; display: flex; justify-content: center; align-items: center; }
  .flipping-next .flipper-front { border-radius: 0 3px 3px 0; }
  .flipping-next .flipper-back { transform: rotateY(180deg); border-radius: 3px 0 0 3px; }
  .flipping-prev .flipper-front { border-radius: 3px 0 0 3px; }
  .flipping-prev .flipper-back { transform: rotateY(-180deg); border-radius: 0 3px 3px 0; }
  .blank-page { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; color: #999; font-style: italic; background: #f9f9f9; }
  .cover-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 20px; background: linear-gradient(to right, rgba(255,255,255,0.5), rgba(0,0,0,0.04) 35%, rgba(0,0,0,0.08) 100%); z-index: 10; pointer-events: none; }
  .shadow-left-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 35px; background: linear-gradient(to right, rgba(0,0,0,0.12), transparent); z-index: 10; pointer-events: none; }
  .shadow-right-edge { position: absolute; right: 0; top: 0; bottom: 0; width: 35px; background: linear-gradient(to left, rgba(0,0,0,0.12), transparent); z-index: 10; pointer-events: none; }

  .footer-controls-area { padding: 0; background: #ffffff; border-top: 1px solid #E5E9EA; display: flex; flex-direction: column; z-index: 100; box-shadow: 0 -5px 20px rgba(0,0,0,0.03); }
  .feedback-section { padding: 15px 30px; display: flex; gap: 20px; align-items: stretch; background: #F4F7F6; border-bottom: 1px solid #E5E9EA; justify-content: center; }
  .feedback-info { width: 220px; display: flex; flex-direction: column; justify-content: center; flex-shrink: 0; }
  .feedback-info h3 { color: #187880; font-size: 0.95rem; margin-bottom: 5px; font-weight: 600;}
  .feedback-info p { color: #666; font-size: 0.75rem; line-height: 1.4; }

  .feedback-input-container { flex: 1; max-width: 800px; display: flex; flex-direction: column; }
  .page-feedback-textarea { width: 100%; background: #ffffff; border: 1px solid #ddd; color: #333333; border-radius: 6px; padding: 12px; font-size: 0.95rem; line-height: 1.5; resize: none; outline: none; transition: 0.2s; height: 75px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);}
  .page-feedback-textarea::placeholder { color: #aaa; }
  .page-feedback-textarea:focus { border-color: #187880; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02), 0 0 0 3px rgba(24, 120, 128, 0.1); }

  .shadow-disclaimer-text { color: #888; font-size: 0.75rem; margin-top: 6px; letter-spacing: 0.5px; text-align: center;}
  .save-status { font-size: 0.75rem; color: #187880; opacity: 0; transition: opacity 0.3s; margin-top: 5px; font-weight: 600;}
  .save-status.visible { opacity: 1; }

  .navigation-bar { display: flex; justify-content: flex-end; align-items: center; padding: 12px 30px; }
  .finish-btn { padding: 8px 25px; background: transparent; color: #187880; border: 1px solid #187880; border-radius: 20px; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: 0.2s; min-width: 120px; }
  .finish-btn:hover { background: rgba(24, 120, 128, 0.1); }

  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 9999; padding: 15px; }
  .final-modal-box { position: relative; display: flex; flex-direction: column; background: #ffffff; border-top: 5px solid #187880; padding: 30px; border-radius: 12px; width: 100%; max-width: 680px; max-height: 85vh; box-shadow: 0 25px 60px rgba(0,0,0,0.2); }
  .brand-title { flex-shrink: 0; color: #187880; font-size: 1.6rem; text-align: center; }

  .legal-content-wrapper { flex: 1; min-height: 0; overflow-y: auto; margin: 15px 0; display: flex; flex-direction: column; gap: 12px; padding-right: 5px; }
  .legal-content-wrapper::-webkit-scrollbar { width: 5px; }
  .legal-content-wrapper::-webkit-scrollbar-thumb { background: #ccc; border-radius: 5px; }

  .legal-item { display: flex; align-items: flex-start; gap: 12px; text-align: left; background: #F4F7F6; padding: 15px; border-radius: 6px; border-left: 4px solid #187880; }
  .legal-icon { font-size: 1.2rem; }
  .legal-text { font-size: 0.85rem; color: #555; line-height: 1.6; }

  .btn-agree { flex-shrink: 0; width: 100%; padding: 14px; background: #187880; color: #fff; border: none; border-radius: 6px; font-weight: 600; font-size: 1.05rem; cursor: pointer; transition: 0.2s; letter-spacing: 1px; }
  .btn-agree:hover { background: #136066; box-shadow: 0 4px 12px rgba(24, 120, 128, 0.2); }

  .close-modal-btn { position: absolute; top: 15px; right: 20px; background: transparent; border: none; color: #999; font-size: 22px; cursor: pointer; transition: 0.2s; }
  .close-modal-btn:hover { color: #333; transform: scale(1.1); }

  .action-cards-container { display: flex; gap: 20px; margin-top: 10px; overflow-y: auto; max-height: 60vh; padding-right: 5px;}
  .action-card { flex: 1; background: #ffffff; border: 1px solid #E5E9EA; padding: 25px; border-radius: 8px; text-align: left; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  .card-title { margin-bottom: 8px; font-size: 1.05rem; font-weight: 600; }
  .card-desc { color: #666; font-size: 0.85rem; line-height: 1.5; margin-bottom: 20px; flex: 1; }
  .final-feedback-summary { background: #F4F7F6; color: #333; border: 1px solid #ddd; padding: 15px; border-radius: 6px; margin-bottom: 15px; max-height: 150px; overflow-y: auto; font-size: 0.85rem; white-space: pre-wrap; line-height: 1.5;}

  .modal-copy-btn { width: 100%; padding: 12px; background: #00B900; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 0.95rem; }
  .modal-copy-btn:hover { background: #009900; color: #fff; }
  .modal-copy-btn.outline { background: transparent; color: #00B900; border: 1px solid #00B900; }
  .modal-copy-btn.outline:hover { background: rgba(0, 185, 0, 0.08); color: #00B900; }

  @media (max-width: 768px) {
    .header-bar { padding: 12px 15px; flex-wrap: wrap; gap: 8px; }
    .brand-logo-text-small { font-size: 1.1rem; }
    .header-actions { margin-left: auto; }
    .view-tabs { width: 100%; order: 3; justify-content: flex-start; padding-bottom: 5px; }

    .stage-center-area { padding: 45px 10px 30px 10px; }
    .stage-top-indicator { top: 12px; font-size: 0.9rem; padding: 0 45px; }

    .nav-btn-floating { width: 38px; height: 38px; font-size: 1rem; }
    .nav-left { left: 5px; }
    .nav-right { right: 5px; }

    .album-layout-wrapper, .merch-layout-wrapper { width: 92vw !important; align-items: center; justify-content: center; }
    .crop-toggle-btn-inline { margin-top: 15px; padding: 6px 14px; font-size: 0.8rem; }
    .album-tool-row { justify-content: center; }
    .nav-btn-floating.nav-up, .nav-btn-floating.nav-down { right: 5px; }
    .nav-btn-floating.nav-up { top: calc(50% - 24px); }
    .nav-btn-floating.nav-down { top: calc(50% + 24px); }
    .merch-img-wrapper img { max-height: 50vh; }

    .footer-controls-area { border-top: 1px solid #ddd; padding-bottom: max(20px, env(safe-area-inset-bottom)); }
    .feedback-section { flex-direction: column; gap: 6px; padding: 15px; }
    .feedback-info { width: 100%; flex-direction: row; justify-content: space-between; align-items: center; }
    .feedback-info h3 { font-size: 0.85rem; margin: 0; }
    .feedback-info p { display: none; }
    .save-status { margin: 0; font-size: 0.75rem; }
    .page-feedback-textarea { height: 60px; padding: 8px; font-size: 0.85rem; }
    .shadow-disclaimer-text { font-size: 0.65rem; margin-top: 4px; }

    .navigation-bar { padding: 15px; justify-content: flex-end; }
    .finish-btn { padding: 10px 18px; font-size: 0.9rem; min-width: 90px; }

    .final-modal-box { padding: 25px 20px; max-height: 75vh; }
    .brand-title { font-size: 1.3rem !important; }
    .legal-content-wrapper { margin: 15px 0; gap: 8px; }
    .legal-item { flex-direction: column; gap: 6px; padding: 12px; }
    .legal-icon { font-size: 1.1rem; }
    .legal-text { font-size: 0.8rem; }
    .btn-agree { padding: 12px; font-size: 1rem; margin-top: 10px;}
    .action-cards-container { flex-direction: column; gap: 15px; }
    .action-card { padding: 18px; }
  }
`;

interface Photo { id: string; name: string; url: string; mimeType?: string; w?: number; h?: number; }

// ==========================================
// 🧰 工具函式（V2 新增）
// ==========================================
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|tiff?)$/i;
const isImageFile = (f: Photo) =>
  f.mimeType ? f.mimeType.indexOf("image/") === 0 : IMAGE_EXT.test(f.name || "");

const naturalCompare = (a = "", b = "") =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const fastUrl = (id: string) => `https://lh3.googleusercontent.com/d/${id}=w2400`;

// 載入圖片並回傳比例；失敗或逾時回傳 null（不再默默當成 2:1）
const loadImage = (url: string, timeoutMs = 8000): Promise<number | null> =>
  new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), timeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(img.naturalWidth / img.naturalHeight); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });

// 需求單編號（台北時間 yyyyMMdd-HHmmss），與雲端檔名一致
const makeRef = () => {
  const iso = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
  return iso.slice(0, 10).replace(/-/g, "") + "-" + iso.slice(11, 19).replace(/:/g, "");
};

// 剪貼簿容錯：新 API 失敗（LINE 內建瀏覽器常見）改用舊方法
const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fallback */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
};

const safeStorage = {
  get(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, val: string) { try { localStorage.setItem(key, val); } catch { /* ignore */ } },
  remove(key: string) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

export default function App() {
  const [appMode, setAppMode] = useState<'admin' | 'viewer'>('admin');
  const [displayName, setDisplayName] = useState("");
  const [folderLink, setFolderLink] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [currentView, setCurrentView] = useState<'album' | 'merch'>('album');
  const [albumName, setAlbumName] = useState("");
  const [folderId, setFolderId] = useState("");
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [merchPhotos, setMerchPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gatePassed, setGatePassed] = useState(false);
  const [dynamicAspectRatio, setDynamicAspectRatio] = useState<number | null>(null);
  const [albumSpreadIndex, setAlbumSpreadIndex] = useState(0);
  const [merchIndex, setMerchIndex] = useState(0);
  const [flipState, setFlipState] = useState<{ direction: "next" | "prev"; from: number; to: number; active: boolean; } | null>(null);
  const [showAlbumCropLines, setShowAlbumCropLines] = useState(true);
  const [showMerchCropLines, setShowMerchCropLines] = useState(true);
  // V2：相冊回饋改以「照片 ID」為 key（原本用頁碼，檔案增減時會錯位）
  const [allFeedbacks, setAllFeedbacks] = useState<Record<string, Record<string, string>>>({});
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [showFinalUI, setShowFinalUI] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<"approve" | "feedback" | null>(null);
  // V2.1：整本旋轉 90°（手機直拿時跨頁可放大，改為上下翻閱）
  const [isAlbumRotated, setIsAlbumRotated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  // V2.3：周邊原始尺寸備援（Apps Script 未回傳 w/h 時，以載入後的圖片尺寸估算）
  const [merchDims, setMerchDims] = useState<Record<string, { w: number; h: number }>>({});
  const submitRefRef = useRef<{ type: string; ref: string } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const albumRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftReadyRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nameFromUrl = params.get("name") || params.get("album");
    const idFromUrl = params.get("id");

    if (idFromUrl) {
      setAppMode('viewer');
      setAlbumName(nameFromUrl || "校稿預覽");
      setFolderId(idFromUrl);
      fetchPhotos(idFromUrl);
    } else {
      setAppMode('admin');
    }
  }, []);

  // 💾 草稿自動存檔（依資料夾 ID，保留 30 天）→ 重整、誤關、從 LINE 返回都不遺失
  useEffect(() => {
    if (!folderId || !draftReadyRef.current) return;
    safeStorage.set(DRAFT_PREFIX + folderId, JSON.stringify({ savedAt: Date.now(), feedbacks: allFeedbacks }));
  }, [allFeedbacks, folderId]);

  // 🚀 預載前後兩個跨頁，翻頁時不再出現白頁閃爍
  useEffect(() => {
    if (currentView === 'album') {
      [1, 2, -1].forEach(d => { const p = albumPhotos[albumSpreadIndex + d]; if (p) { const i = new Image(); i.src = p.url; } });
    } else {
      [1, -1].forEach(d => { const p = merchPhotos[merchIndex + d]; if (p) { const i = new Image(); i.src = p.url; } });
    }
  }, [albumSpreadIndex, merchIndex, currentView, albumPhotos, merchPhotos]);

  const extractIdFromLink = (link: string) => {
    const folderMatch = link.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return folderMatch[1];
    const idMatch = link.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];
    return link.trim();
  };

  const handleGenerateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !folderLink.trim()) return;

    const targetId = extractIdFromLink(folderLink);
    // V2：加上 openExternalBrowser=1，客人從 LINE 點開會改用手機預設瀏覽器（剪貼簿、跳轉更穩定）
    const directLink = `${window.location.origin}${window.location.pathname}?name=${encodeURIComponent(displayName.trim())}&id=${targetId}&openExternalBrowser=1`;
    setGeneratedLink(directLink);
    setIsCopied(false);
  };

  const handleResetForm = () => {
    setDisplayName("");
    setFolderLink("");
    setGeneratedLink("");
    setIsCopied(false);
  };

  const copyGeneratedLink = () => {
    copyText(generatedLink).then(ok => {
      if (!ok) return;
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    });
  };

  const checkIsSinglePage = (photo: Photo | null, pageIdx: number, totalLen: number) => {
    if (!photo) return false;
    const n = (photo.name || "");
    if (pageIdx === 0 && n.includes("封面") && !n.includes("封底")) return true;
    if (pageIdx === totalLen - 1 && n.includes("封底") && !n.includes("封面")) return true;
    return false;
  };

  const fetchWithRetry = async (url: string, retries = 3): Promise<any> => {
    let lastErr: any;
    for (let i = 0; i < retries; i++) {
      let text = "";
      try {
        const res = await fetch(url);
        text = await res.text();
      } catch (err) {
        lastErr = err;                       // 網路錯誤 → 重試
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      if (text.startsWith('<!DOCTYPE') || text.includes('<html')) {
        lastErr = new Error("Google 伺服器短暫異常，請重新整理頁面。");
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      const json = JSON.parse(text);
      if (json && json.error) throw new Error(json.error); // 權限／ID 錯誤不必重試
      return json;
    }
    throw lastErr;
  };

  const fetchPhotos = async (id: string) => {
    setLoading(true); setError("");
    try {
      const data = await fetchWithRetry(`${API_URL}?folderId=${id}`);

      // 🔒 已送出鎖定
      if (data && !Array.isArray(data) && data.locked) {
        safeStorage.remove(DRAFT_PREFIX + id);
        setError("此校稿已完成送出 ✅ 如需再次調整，請透過 LINE 與我們聯繫，謝謝您！");
        return;
      }

      // 只保留圖片檔（排除 txt / json / 鎖定檔等）
      const rawData: Photo[] = (Array.isArray(data) ? data : []).filter(isImageFile);

      const filteredAlbum: Photo[] = [];
      const filteredMerch: Photo[] = [];

      rawData.forEach(file => {
        const n = file.name.toLowerCase();
        const isMerch = /框|畫|卡|海報|桌曆|周邊|簽名|小物|相紙|10x10|8x8/.test(n);
        const isAlbumCover = (n.includes("封面") || n.includes("封底")) && !isMerch;

        if (isMerch && !isAlbumCover) {
          filteredMerch.push(file);
        } else {
          filteredAlbum.push(file);
        }
      });

      const getWeight = (filename = "") => {
        const n = filename.toLowerCase();
        if (n.includes("封面") || n.startsWith("000")) return -999999;
        if (n.includes("封底")) return 999999;
        const match = filename.match(/_(\d+)/);
        return (match && match[1]) ? parseInt(match[1], 10) : 0;
      };
      // V2：同權重時以檔名自然排序（避免 1, 10, 2 亂序）
      const sortedAlbum = filteredAlbum.sort((a, b) => (getWeight(a.name) - getWeight(b.name)) || naturalCompare(a.name, b.name));
      const sortedMerch = filteredMerch.sort((a, b) => naturalCompare(a.name, b.name));

      // ⚡ 圖片網址：依序測試 lh3 CDN → Drive 縮圖 → 原網址，採用第一個能顯示的
      //    （Google 已限制 uc?export=view 嵌入，單靠原網址常會白屏）
      const probe = sortedAlbum.find((p, idx) => !checkIsSinglePage(p, idx, sortedAlbum.length)) || sortedAlbum[0] || null;
      const probeTarget = probe || sortedMerch[0] || null;
      const urlBuilders: ((p: Photo) => string)[] = [
        ...(USE_FAST_CDN ? [(p: Photo) => fastUrl(p.id)] : []),
        (p: Photo) => `https://drive.google.com/thumbnail?id=${p.id}&sz=w2400`,
        (p: Photo) => p.url,
      ];
      let ratio: number | null = null;
      let chosen: ((p: Photo) => string) | null = null;
      if (probeTarget) {
        for (const build of urlBuilders) {
          ratio = await loadImage(build(probeTarget), 6000);
          if (ratio !== null) { chosen = build; break; }
        }
      }
      if (probeTarget && !chosen) {
        throw new Error("照片無法顯示：請將校稿資料夾的共用設定改為「知道連結的任何人 → 檢視者」後重新整理。");
      }
      const mapUrl = (p: Photo) => (chosen ? { ...p, url: chosen(p) } : p);

      if (probe) {
        const isSpread = !checkIsSinglePage(probe, sortedAlbum.indexOf(probe), sortedAlbum.length);
        const natural = ratio ?? 1;
        setDynamicAspectRatio(isSpread ? (ratio ?? 2) : natural * 2);
      } else {
        setDynamicAspectRatio(2);
      }

      setAlbumPhotos(sortedAlbum.map(mapUrl));
      setMerchPhotos(sortedMerch.map(mapUrl));
      setAlbumSpreadIndex(0);
      setMerchIndex(0);

      // 還原草稿
      let restored: Record<string, Record<string, string>> = {};
      const raw = safeStorage.get(DRAFT_PREFIX + id);
      if (raw) {
        try {
          const d = JSON.parse(raw);
          if (d && Date.now() - d.savedAt < DRAFT_TTL_MS) restored = d.feedbacks || {};
          else safeStorage.remove(DRAFT_PREFIX + id);
        } catch { /* ignore */ }
      }
      setAllFeedbacks(restored);
      draftReadyRef.current = true;

      if (sortedAlbum.length === 0 && sortedMerch.length > 0) {
        setCurrentView('merch');
      } else {
        setCurrentView('album');
      }

      if (sortedAlbum.length === 0 && sortedMerch.length === 0) {
        setError("此資料夾內目前沒有可校稿的圖片，請與我們聯繫。");
      }
    } catch (err: any) {
      setError(err?.message || "無法載入圖片。請確認您貼上的「資料夾網址」是否正確，且該資料夾已開放檢視權限。");
    } finally {
      setLoading(false);
    }
  };

  const maxSpreads = Math.max(0, albumPhotos.length - 1);

  const handlePageChange = (newIndex: number) => {
    if (currentView !== 'album' || newIndex === albumSpreadIndex || flipState) return;
    const direction = newIndex > albumSpreadIndex ? "next" : "prev";
    setFlipState({ direction, from: albumSpreadIndex, to: newIndex, active: false });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFlipState(prev => prev ? { ...prev, active: true } : null));
    });
    setTimeout(() => { setAlbumSpreadIndex(newIndex); setFlipState(null); }, 800);
  };

  // 👑 V2.2：整份校稿（相冊 → 周邊）視為一條順序，看到最後一頁才可送出
  const totalItems = albumPhotos.length + merchPhotos.length;
  const currentPos = currentView === 'album' ? albumSpreadIndex : albumPhotos.length + merchIndex;
  const remainingItems = Math.max(0, totalItems - 1 - currentPos);
  const goNextGlobal = () => {
    if (currentView === 'album') {
      if (albumSpreadIndex < maxSpreads) handlePageChange(albumSpreadIndex + 1);
      else if (merchPhotos.length > 0 && !flipState) { setCurrentView('merch'); setMerchIndex(0); }
    } else {
      setMerchIndex(prev => Math.min(merchPhotos.length - 1, prev + 1));
    }
  };
  const goPrevMerch = () => {
    if (merchIndex > 0) setMerchIndex(merchIndex - 1);
    else if (albumPhotos.length > 0) setCurrentView('album');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (appMode === 'admin' || showFinalUI || !gatePassed) return;
      if (document.activeElement?.tagName === "TEXTAREA") return;

      if (currentView === 'album' && albumPhotos.length > 0) {
        if (e.code === "ArrowRight") goNextGlobal();
        if (e.code === "ArrowLeft") handlePageChange(Math.max(0, albumSpreadIndex - 1));
        if (isAlbumRotated && e.code === "ArrowDown") { e.preventDefault(); goNextGlobal(); }
        if (isAlbumRotated && e.code === "ArrowUp") { e.preventDefault(); handlePageChange(Math.max(0, albumSpreadIndex - 1)); }
      } else if (currentView === 'merch' && merchPhotos.length > 0) {
        if (e.code === "ArrowRight") setMerchIndex(prev => Math.min(merchPhotos.length - 1, prev + 1));
        if (e.code === "ArrowLeft") goPrevMerch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appMode, currentView, albumSpreadIndex, maxSpreads, flipState, albumPhotos.length, merchPhotos.length, showFinalUI, gatePassed, isAlbumRotated, merchIndex]);

  // 📱 手勢翻頁：一般模式左右滑、旋轉模式上下滑（向上滑 = 下一頁）
  const handleAlbumTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) { touchStartRef.current = null; return; }
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleAlbumTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || !gatePassed || flipState) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    const main = isAlbumRotated ? dy : dx;
    const cross = isAlbumRotated ? dx : dy;
    if (Math.abs(main) < 50 || Math.abs(main) < Math.abs(cross)) return;
    if (main < 0) goNextGlobal();
    else handlePageChange(Math.max(0, albumSpreadIndex - 1));
  };

  const handleFeedbackChange = (key: string, value: string) => {
    setAllFeedbacks(prev => ({
      ...prev,
      [currentView]: {
        ...(prev[currentView] || {}),
        [key]: value
      }
    }));
  };

  const triggerSaveIndicator = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveIndicator(true);
    saveTimerRef.current = setTimeout(() => setSaveIndicator(false), 2000);
  };

  const getAlbumIndicatorLabel = (index = albumSpreadIndex) => {
    const p = albumPhotos[index];
    if (!p) return "";
    const n = p.name || "";
    if (index === 0) return checkIsSinglePage(p, 0, albumPhotos.length) ? "Cover 封面" : "Cover 封面與封底";
    if (index === albumPhotos.length - 1 && n.includes("封底")) return "Back Cover 封底";
    const match = n.match(/_(\d+)/);
    return match ? `Spread ${match[1]} 跨頁` : `Spread ${index} 跨頁`;
  };

  const getStageTitle = () => {
    if (currentView === 'album') return getAlbumIndicatorLabel();
    return `📦 ${merchPhotos[merchIndex]?.name.split('.')[0]} (${merchIndex + 1} / ${merchPhotos.length})`;
  };

  // 結構化回饋（依實際頁序），供摘要與雲端備份共用
  const collectFeedbackItems = () => {
    const albumFb = allFeedbacks['album'] || {};
    const merchFb = allFeedbacks['merch'] || {};
    const album = albumPhotos
      .map((p, idx) => ({ type: 'album', id: p.id, name: p.name, label: getAlbumIndicatorLabel(idx), feedback: (albumFb[p.id] || '').trim() }))
      .filter(it => it.feedback);
    const merch = merchPhotos
      .map(p => ({ type: 'merch', id: p.id, name: p.name, label: p.name.split('.')[0], feedback: (merchFb[p.id] || '').trim() }))
      .filter(it => it.feedback);
    return { album, merch };
  };

  const generateFeedbackSummary = () => {
    const { album, merch } = collectFeedbackItems();
    let summary = "";
    if (album.length) summary += `\n📖 【3D 相冊校稿】：\n` + album.map(it => `📍 [相冊 - ${it.label}]：\n   ${it.feedback}\n`).join("");
    if (merch.length) summary += `\n🖼️ 【周邊商品校稿】：\n` + merch.map(it => `📍 [周邊 - ${it.label}]：\n   ${it.feedback}\n`).join("");
    return summary.trim();
  };

  // ☁️ 雲端備份：存到該案資料夾內「校稿回覆」（JSON＋TXT＋PDF）並自動鎖定連結
  const backupToCloud = async (type: "approve" | "feedback", ref: string, summary: string, beacon = false) => {
    const { album, merch } = collectFeedbackItems();
    const payload = {
      action: 'submit',
      folderId,
      caseName: albumName,
      ref,
      status: type === 'approve' ? 'approved' : 'feedback',
      submittedAt: new Date().toISOString(),
      totalAlbum: albumPhotos.length,
      totalMerch: merchPhotos.length,
      items: [...album, ...merch],
      summary,
      userAgent: navigator.userAgent,
    };
    // 無修改：用 sendBeacon 背景送出（不等待，立即開 LINE）
    if (beacon && navigator.sendBeacon) {
      try { return navigator.sendBeacon(API_URL, new Blob([JSON.stringify(payload)], { type: 'text/plain;charset=utf-8' })); }
      catch { return false; }
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), BACKUP_WAIT_MS);
    try {
      // text/plain 可避免 CORS 預檢，Apps Script 照常收到 JSON
      const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), signal: ctrl.signal });
      const json = JSON.parse(await res.text());
      return !!json.ok;
    } catch (err) {
      console.warn("Cloud backup failed", err);
      return false;
    } finally {
      clearTimeout(timer);
    }
  };

  // 👑 LINE 串接：先複製 → 同步雲端（最多等 8 秒）→ 跳轉 LINE
  const handleSendToLine = async (type: "approve" | "feedback") => {
    if (sendingStatus) return; // 防止重複點擊

    // V2.2：同一次送出重按時沿用同一編號，雲端端會自動略過重複資料
    const prev = submitRefRef.current;
    const ref = prev && prev.type === type ? prev.ref : makeRef();
    submitRefRef.current = { type, ref };
    const summary = generateFeedbackSummary();
    let textToSend = "";
    if (type === "approve") {
      textToSend = `【辰妍國際 校稿確認】\n案號：${albumName}\n需求單編號：${ref}\n狀態：✅ 所有項目皆確認無誤，請安排印務製作，謝謝！`;
    } else {
      if (!summary) { alert("您尚未填寫任何修改需求喔！"); return; }
      textToSend = `【辰妍國際 校稿調整需求】\n案號：${albumName}\n需求單編號：${ref}\n狀態：⚠️ 希望微調內容\n\n📌 調整說明：\n${summary}`;
    }

    setSendingStatus(type);

    // 第一重：複製完整內容（必須在任何 await 網路請求之前，iOS 才允許）
    await copyText(textToSend);

    // 第二重：雲端備份（有修改才等待；無修改背景送出公版紀錄）
    if (type === "feedback") setIsSyncing(true);
    const synced = await backupToCloud(type, ref, summary, type === "approve");
    setIsSyncing(false);
    if (synced) safeStorage.remove(DRAFT_PREFIX + folderId);

    // 第三重：LINE 預填文字過長時截斷，避免網址過長無法開啟
    let lineText = textToSend;
    if (type === "feedback" && summary.length > LINE_SUMMARY_LIMIT) {
      lineText = textToSend.slice(0, textToSend.length - summary.length) + summary.slice(0, LINE_SUMMARY_LIMIT) +
        `…\n\n（內容較長，完整需求已${synced ? "同步至雲端並" : ""}複製，請直接貼上）`;
    }
    const lineUrl = `https://line.me/R/oaMessage/${encodeURIComponent(LINE_OA_ID)}/?${encodeURIComponent(lineText)}`;
    window.location.href = lineUrl;
    setTimeout(() => setSendingStatus(null), 2000);
  };

  if (appMode === 'admin') {
    return (
      <React.Fragment>
        <style>{GLOBAL_STYLES}</style>
        <div className="admin-viewport">
          <div className="admin-box">
            <h1 className="brand-logo-text">辰妍國際</h1>
            <p className="brand-subtitle">ALBUM PROOFING SYSTEM</p>

            <form onSubmit={handleGenerateLink}>
              <div className="input-group">
                <label className="input-label">1. 設定對外顯示的案號名稱：</label>
                <input
                  className="drive-input"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="例如：羅郁婷-相冊三校"
                />
              </div>
              <div className="input-group">
                <label className="input-label">2. 請貼上「校稿資料夾」的雲端硬碟網址：</label>
                <input
                  className="drive-input"
                  value={folderLink}
                  onChange={e => setFolderLink(e.target.value)}
                  placeholder="請貼上該特定版本資料夾的連結..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn-reset" type="button" onClick={handleResetForm}>
                  清除重填
                </button>
                <button className="btn-generate" type="submit" disabled={!displayName.trim() || !folderLink.trim()} style={{ margin: 0, flex: 1 }}>
                  產生精準專屬連結
                </button>
              </div>
            </form>

            {generatedLink && (
              <div className="result-box">
                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '10px' }}>給客人的專屬直連網址：</p>
                <div className="client-link-text">{generatedLink}</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-copy" onClick={copyGeneratedLink}>
                    {isCopied ? "✓ 已複製連結" : "📋 複製給客人"}
                  </button>
                  <a href={generatedLink} target="_blank" rel="noopener noreferrer" className="btn-preview">
                    👁️ 預覽畫面
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </React.Fragment>
    );
  }

  if (loading || error || dynamicAspectRatio === null || (albumPhotos.length === 0 && merchPhotos.length === 0)) {
    return (
      <React.Fragment>
        <style>{GLOBAL_STYLES}</style>
        <div className="admin-viewport">
          <div className="admin-box" style={{ padding: '60px', boxShadow: 'none', border: 'none', background: 'transparent' }}>
            <h1 className="brand-logo-text" style={{ fontSize: '2rem' }}>辰妍國際</h1>
            <p style={{ color: '#888', marginTop: '20px' }}>{error ? error : "正在為您精準載入相冊，請稍候..."}</p>
          </div>
        </div>
      </React.Fragment>
    );
  }

  let baseLeftIndex = albumSpreadIndex;
  let baseRightIndex = albumSpreadIndex;
  if (flipState) {
    baseLeftIndex = flipState.direction === "next" ? flipState.from : flipState.to;
    baseRightIndex = flipState.direction === "next" ? flipState.to : flipState.from;
  }

  const ALBUM_CROP_Y = "1.5%";
  const ALBUM_CROP_X = "0.75%";
  const MERCH_CROP_PERCENT = "1.5%";

  const isCurrentViewSingle = checkIsSinglePage(albumPhotos[albumSpreadIndex], albumSpreadIndex, albumPhotos.length);
  const albumCropLineStyleInside = isCurrentViewSingle
    ? (albumSpreadIndex === 0
        ? { top: ALBUM_CROP_Y, bottom: ALBUM_CROP_Y, left: `calc(50% + ${ALBUM_CROP_X})`, right: ALBUM_CROP_X }
        : { top: ALBUM_CROP_Y, bottom: ALBUM_CROP_Y, left: ALBUM_CROP_X, right: `calc(50% + ${ALBUM_CROP_X})` })
    : { top: ALBUM_CROP_Y, bottom: ALBUM_CROP_Y, left: ALBUM_CROP_X, right: ALBUM_CROP_X };
  // V2.2：外圍模式 → 虛線貼在作品外 CROP_OUT 處，不覆蓋畫面
  const albumCropLineStyleOutside = isCurrentViewSingle
    ? (albumSpreadIndex === 0
        ? { top: CROP_OUT, bottom: CROP_OUT, left: `calc(50% + ${CROP_OUT})`, right: CROP_OUT }
        : { top: CROP_OUT, bottom: CROP_OUT, left: CROP_OUT, right: `calc(50% + ${CROP_OUT})` })
    : { top: CROP_OUT, bottom: CROP_OUT, left: CROP_OUT, right: CROP_OUT };
  const albumCropLineStyle = CROP_LINE_OUTSIDE ? albumCropLineStyleOutside : albumCropLineStyleInside;

  let containerTransform = "translateX(0%)";
  if (currentView === 'album') {
    if (albumSpreadIndex === 0 && checkIsSinglePage(albumPhotos[0], 0, albumPhotos.length)) {
      containerTransform = "translateX(-25%)";
    } else if (albumSpreadIndex === maxSpreads && checkIsSinglePage(albumPhotos[maxSpreads], maxSpreads, albumPhotos.length)) {
      containerTransform = "translateX(25%)";
    }
  }

  const isCoverView = albumSpreadIndex === 0 && isCurrentViewSingle && !flipState;
  const isBackCoverView = albumSpreadIndex === maxSpreads && isCurrentViewSingle && !flipState;
  const containerClasses = `album-book-container ${isCoverView ? 'is-front-cover' : ''} ${isBackCoverView ? 'is-back-cover' : ''}`;

  const renderPageInner = (photo: Photo | null, pageIdx: number, side: "left" | "right") => {
    if (!photo) return <div className="blank-page">Blank Page 留白</div>;
    const isSingle = checkIsSinglePage(photo, pageIdx, albumPhotos.length);

    if (isSingle) {
      if (pageIdx === 0) {
        if (side === "left") return null;
        return (
          <>
            <div className="cover-spine" />
            <div style={{
              width: "100%", height: "100%", backgroundColor: "#fff",
              backgroundImage: `url(${photo.url})`,
              backgroundSize: "100% 100%",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat"
            }} />
          </>
        );
      } else {
        if (side === "right") return null;
        return (
          <>
            <div className="shadow-right-edge" />
            <div style={{
              width: "100%", height: "100%", backgroundColor: "#fff",
              backgroundImage: `url(${photo.url})`,
              backgroundSize: "100% 100%",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat"
            }} />
          </>
        );
      }
    }

    return (
      <>
        {pageIdx === 0 && <div className="cover-spine" />}
        {pageIdx !== 0 && side === "left" && <div className="shadow-right-edge" />}
        {pageIdx !== 0 && side === "right" && <div className="shadow-left-edge" />}
        <div style={{ width: "100%", height: "100%", backgroundColor: "#fff", backgroundImage: `url(${photo.url})`, backgroundSize: "200% 100%", backgroundPosition: side === "left" ? "left center" : "right center", backgroundRepeat: "no-repeat" }} />
      </>
    );
  };

  const renderAlbumTools = () => gatePassed ? (
    <div className="album-tool-row">
      <button
        className="crop-toggle-btn-inline"
        style={isAlbumRotated ? { background: '#187880', color: '#fff' } : undefined}
        onClick={() => setIsAlbumRotated(r => !r)}
        title="手機直拿時可旋轉放大跨頁，改為上下滑動翻頁"
      >
        {isAlbumRotated ? '↩️ 恢復原方向' : '🔄 旋轉相冊'}
      </button>
      <button
        className={`crop-toggle-btn-inline ${showAlbumCropLines ? 'active' : ''}`}
        onClick={() => setShowAlbumCropLines(!showAlbumCropLines)}
        title="模擬印刷廠的安全裁切範圍"
      >
        {showAlbumCropLines ? '👁️ 隱藏裁切線' : '✂️ 顯示裁切線'}
      </button>
    </div>
  ) : null;

  // V2.3：計算周邊商品的內縮顯示（回傳 null = 照原樣顯示）
  const getMerchTrim = (p: Photo) => {
    const rule = getMerchTrimRule(p.name || "");
    if (!rule) return null;
    const dims = p.w && p.h ? { w: p.w, h: p.h } : merchDims[p.id];
    if (!dims) return null;
    const px = (mm: number) => (mm / 25.4) * MERCH_DPI;
    const t = rule.trimMm;
    const fl = px(t.left) / dims.w, fr = px(t.right) / dims.w;
    const ft = px(t.top) / dims.h, fb = px(t.bottom) / dims.h;
    const keepW = 1 - fl - fr, keepH = 1 - ft - fb;
    if (keepW <= 0.2 || keepH <= 0.2) return null; // 尺寸異常時不裁，避免畫面錯亂
    return {
      ratio: (dims.w * keepW) / (dims.h * keepH),
      bgSize: `${100 / keepW}% ${100 / keepH}%`,
      bgPos: `${fl + fr > 0 ? (fl / (fl + fr)) * 100 : 50}% ${ft + fb > 0 ? (ft / (ft + fb)) * 100 : 50}%`,
    };
  };

  const currentAlbumPhoto = albumPhotos[albumSpreadIndex];

  return (
    <React.Fragment>
      <style>{GLOBAL_STYLES}</style>
      <div className="app-grid-shell" ref={albumRef} tabIndex={0} style={{ outline: 'none' }}>

        <header className="header-bar">
          <div className="brand-logo-text-small">辰妍國際</div>

          {merchPhotos.length > 0 && albumPhotos.length > 0 && (
            <div className="view-tabs">
              <button
                className={`tab-btn ${currentView === 'album' ? 'active' : ''}`}
                onClick={() => setCurrentView('album')}
              >
                📖 3D 相冊校稿
              </button>
              <button
                className={`tab-btn ${currentView === 'merch' ? 'active' : ''}`}
                onClick={() => setCurrentView('merch')}
              >
                🖼️ 周邊商品校稿
              </button>
            </div>
          )}

          <div className="header-actions">
            {/* V2：離開後不清除網址（客人重整即可回來，草稿仍在），也不會卡在「載入中」 */}
            <button className="logout-btn" onClick={() => { setAlbumPhotos([]); setMerchPhotos([]); setGatePassed(false); setShowFinalUI(false); setError("您已離開校稿頁面，填寫內容已暫存於此裝置，重新整理即可繼續。"); }}>離開</button>
          </div>
        </header>

        {currentView === 'album' && albumPhotos.length > 0 && (() => {
          // V2.1：旋轉時書本寬度 W 變成螢幕上的高度
          const ratio = dynamicAspectRatio || 2;
          const rotatedW = `min(66vh, ${(88 * ratio).toFixed(2)}vw)`;
          const goPrev = () => handlePageChange(Math.max(0, albumSpreadIndex - 1));
          const goNext = goNextGlobal;
          const bookInner = (
            <>
                <div className={`album-page-base base-left ${baseLeftIndex === 0 ? "is-cover" : ""}`} style={{ visibility: albumPhotos[baseLeftIndex] ? "visible" : "hidden" }}>
                  {renderPageInner(albumPhotos[baseLeftIndex], baseLeftIndex, "left")}
                </div>

                <div className={`album-page-base base-right ${baseRightIndex === 0 ? "is-cover" : ""}`} style={{ visibility: albumPhotos[baseRightIndex] ? "visible" : "hidden" }}>
                  {renderPageInner(albumPhotos[baseRightIndex], baseRightIndex, "right")}
                </div>

                {flipState && (
                  <div className={`album-flipper flipping-${flipState.direction} ${flipState.active ? "active" : ""}`}>
                    <div className={`flipper-face flipper-front ${(flipState.direction === "next" ? flipState.from : flipState.to) === 0 ? "is-cover" : ""}`}>
                      {renderPageInner(albumPhotos[flipState.from], flipState.from, flipState.direction === "next" ? "right" : "left")}
                    </div>
                    <div className={`flipper-face flipper-back ${(flipState.direction === "prev" ? flipState.from : flipState.to) === 0 ? "is-cover" : ""}`}>
                      {renderPageInner(albumPhotos[flipState.to], flipState.to, flipState.direction === "next" ? "left" : "right")}
                    </div>
                  </div>
                )}

                {gatePassed && showAlbumCropLines && (
                  <div className={`crop-line-overlay ${CROP_LINE_OUTSIDE ? 'outside' : ''}`} style={albumCropLineStyle}>
                    <span className="crop-warning-text">✂️ 裁切線</span>
                  </div>
                )}
            </>
          );
          return (
          <main className="stage-center-area">
            <div className="stage-top-indicator" title={getStageTitle()}>
              {getStageTitle()}
            </div>

            <button
              className={`nav-btn-floating ${isAlbumRotated ? 'nav-up' : 'nav-left'}`}
              onClick={goPrev}
              disabled={albumSpreadIndex === 0 || !!flipState}
            >
              {isAlbumRotated ? <span style={{ display: 'inline-block', transform: 'rotate(90deg)' }}>&#10094;</span> : <>&#10094;</>}
            </button>

            {isAlbumRotated ? (
              <div className="album-layout-wrapper" style={{ width: `calc(${rotatedW} / ${ratio})`, maxWidth: 'none', alignItems: 'center' }}>
                <div className="album-rotate-stage" style={{ height: rotatedW }} onTouchStart={handleAlbumTouchStart} onTouchEnd={handleAlbumTouchEnd}>
                  <div
                    className={`${containerClasses} is-rotated`}
                    style={{ width: rotatedW, aspectRatio: ratio, transform: `translate(-50%, -50%) rotate(90deg) ${containerTransform}` }}
                  >
                    {bookInner}
                  </div>
                </div>
                {renderAlbumTools()}
              </div>
            ) : (
              <div className="album-layout-wrapper" style={{ maxWidth: `calc(55vh * ${dynamicAspectRatio})` }} onTouchStart={handleAlbumTouchStart} onTouchEnd={handleAlbumTouchEnd}>
                <div
                  className={containerClasses}
                  style={{ aspectRatio: dynamicAspectRatio, transform: containerTransform }}
                >
                  {bookInner}
                </div>
                {renderAlbumTools()}
              </div>
            )}

            <button
              className={`nav-btn-floating ${isAlbumRotated ? 'nav-down' : 'nav-right'} ${remainingItems > 0 ? 'has-more' : ''}`}
              onClick={goNext}
              disabled={(albumSpreadIndex === maxSpreads && merchPhotos.length === 0) || !!flipState}
              title={remainingItems > 0 ? `還有 ${remainingItems} 頁待確認` : ''}
            >
              {isAlbumRotated ? <span style={{ display: 'inline-block', transform: 'rotate(90deg)' }}>&#10095;</span> : <>&#10095;</>}
              {remainingItems > 0 && <span className="more-badge">{remainingItems}</span>}
            </button>
          </main>
          );
        })()}

        {currentView === 'merch' && merchPhotos.length > 0 && (
          <main className="stage-center-area">
             <div className="stage-top-indicator" title={getStageTitle()}>
              {getStageTitle()}
            </div>

            <button
              className="nav-btn-floating nav-left"
              onClick={goPrevMerch}
              disabled={merchIndex === 0 && albumPhotos.length === 0}
            >
              &#10094;
            </button>

            <div className="merch-layout-wrapper">
              <div className="merch-image-box">
                {(() => {
                  const mp = merchPhotos[merchIndex];
                  const trim = getMerchTrim(mp);
                  if (trim) {
                    const maxH = typeof window !== 'undefined' && window.innerWidth <= 768 ? 50 : 55;
                    return (
                      <div
                        className="merch-img-wrapper"
                        role="img"
                        aria-label={mp.name}
                        style={{
                          width: `min(100%, calc(${maxH}vh * ${trim.ratio}))`, aspectRatio: trim.ratio, maxHeight: 'none',
                          backgroundImage: `url("${mp.url}")`, backgroundSize: trim.bgSize, backgroundPosition: trim.bgPos, backgroundRepeat: 'no-repeat',
                          borderRadius: 2, boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                        }}
                      >
                        {gatePassed && showMerchCropLines && (
                      <div className={`crop-line-overlay ${CROP_LINE_OUTSIDE ? 'outside' : ''}`} style={CROP_LINE_OUTSIDE ? { top: CROP_OUT, bottom: CROP_OUT, left: CROP_OUT, right: CROP_OUT } : { top: MERCH_CROP_PERCENT, bottom: MERCH_CROP_PERCENT, left: MERCH_CROP_PERCENT, right: MERCH_CROP_PERCENT }}>
                        <span className="crop-warning-text">✂️ 裁切線</span>
                      </div>
                    )}
                      </div>
                    );
                  }
                  return (
                    <div className="merch-img-wrapper">
                      <img
                        src={mp.url}
                        alt={mp.name}
                        draggable="false"
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          // lh3 寬度上限 2400：剛好 2400 代表可能被縮圖，無法得知原尺寸 → 不裁（寧可多顯示）
                          if (!mp.w && getMerchTrimRule(mp.name || "") && !merchDims[mp.id] && img.naturalWidth && img.naturalWidth !== 2400) {
                            setMerchDims(d => ({ ...d, [mp.id]: { w: img.naturalWidth, h: img.naturalHeight } }));
                          }
                        }}
                      />
                      {gatePassed && showMerchCropLines && (
                      <div className={`crop-line-overlay ${CROP_LINE_OUTSIDE ? 'outside' : ''}`} style={CROP_LINE_OUTSIDE ? { top: CROP_OUT, bottom: CROP_OUT, left: CROP_OUT, right: CROP_OUT } : { top: MERCH_CROP_PERCENT, bottom: MERCH_CROP_PERCENT, left: MERCH_CROP_PERCENT, right: MERCH_CROP_PERCENT }}>
                        <span className="crop-warning-text">✂️ 裁切線</span>
                      </div>
                    )}
                    </div>
                  );
                })()}
              </div>

              {gatePassed && (
                <button
                  className={`crop-toggle-btn-inline ${showMerchCropLines ? 'active' : ''}`}
                  onClick={() => setShowMerchCropLines(!showMerchCropLines)}
                  title="模擬印刷廠的安全裁切範圍"
                >
                  {showMerchCropLines ? '👁️ 隱藏裁切線' : '✂️ 顯示裁切線'}
                </button>
              )}
            </div>

            <button
              className={`nav-btn-floating nav-right ${remainingItems > 0 ? 'has-more' : ''}`}
              onClick={goNextGlobal}
              disabled={merchIndex === merchPhotos.length - 1}
              title={remainingItems > 0 ? `還有 ${remainingItems} 頁待確認` : ''}
            >
              &#10095;
              {remainingItems > 0 && <span className="more-badge">{remainingItems}</span>}
            </button>

          </main>
        )}

        <footer className="footer-controls-area">

          {currentView === 'album' && albumPhotos.length > 0 && (
            <div className="feedback-section">
              <div className="feedback-info">
                <h3>📝 修改建議</h3>
                <p>若對此頁照片有調整需求，請在此詳細說明。</p>
                <div className={`save-status ${saveIndicator ? 'visible' : ''}`}>✓ 內容已自動暫存</div>
              </div>
              <div className="feedback-input-container">
                <textarea
                  className="page-feedback-textarea"
                  placeholder={`請輸入修改建議... (若無須修改請留白，翻頁會自動存檔)`}
                  value={(allFeedbacks['album'] || {})[currentAlbumPhoto?.id] || ''}
                  onChange={(e) => currentAlbumPhoto && handleFeedbackChange(currentAlbumPhoto.id, e.target.value)}
                  onBlur={triggerSaveIndicator}
                />
                <div className="shadow-disclaimer-text">
                  * 畫面中央深色陰影為 3D 模擬效果，實體印刷為全景無縫平翻，並無此陰影。
                </div>
              </div>
            </div>
          )}

          {currentView === 'merch' && merchPhotos.length > 0 && (
             <div className="feedback-section">
              <div className="feedback-info">
                <h3>📝 修改建議</h3>
                <p>若對此商品有調整需求，請在此詳細說明。</p>
                <div className={`save-status ${saveIndicator ? 'visible' : ''}`}>✓ 內容已自動暫存</div>
              </div>
              <div className="feedback-input-container">
                <textarea
                  className="page-feedback-textarea"
                  placeholder={`請輸入修改建議... (若無須修改請留白，切換會自動存檔)`}
                  value={(allFeedbacks['merch'] || {})[merchPhotos[merchIndex].id] || ''}
                  onChange={(e) => handleFeedbackChange(merchPhotos[merchIndex].id, e.target.value)}
                  onBlur={triggerSaveIndicator}
                />
                <div className="shadow-disclaimer-text">
                  * 點擊左右箭頭切換商品，系統會自動儲存您的修改建議。
                </div>
              </div>
            </div>
          )}

          <div className="navigation-bar">
             <div className={`page-remaining ${remainingItems === 0 ? 'last' : ''}`}>
               {remainingItems > 0 ? `還有 ${remainingItems} 頁待確認` : '✓ 已看完全部內容'}
             </div>
             {remainingItems > 0 ? (
               <button className="finish-btn" onClick={goNextGlobal} disabled={!!flipState}>下一頁 ›</button>
             ) : (
               <button className="finish-btn" onClick={() => setShowFinalUI(true)}>完成並送出</button>
             )}
          </div>
        </footer>

      </div>

      {!gatePassed && (
        <div className="modal-overlay">
          <div className="final-modal-box">
            <h2 className="brand-title">Copyright Notice<br/>著作權聲明</h2>

            <div className="legal-content-wrapper">
              <div className="legal-item">
                <span className="legal-icon">📌</span>
                <span className="legal-text">本系統顯示之畫面即為定稿印刷排版，請仔細確認照片位置與裁切範圍。</span>
              </div>
              <div className="legal-item">
                <span className="legal-icon">🖨️</span>
                <span className="legal-text">確認無誤並定稿後，將由印務工坊直接進入實體輸出製作，無法再行修改。</span>
              </div>
              <div className="legal-item">
                <span className="legal-icon">📖</span>
                <span className="legal-text">相冊畫面中央之深色陰影為模擬實體相冊翻閱之 3D 視覺效果，實際印刷成品為全景無縫平翻，不會產生此陰影，請您安心校稿。</span>
              </div>
              <div className="legal-item">
                <span className="legal-icon">🔒</span>
                <span className="legal-text">此為專屬機密校稿連結，為保障您的隱私，請妥善保管，勿將網址發布或分享至公開社群平台。</span>
              </div>
              <div className="legal-item">
                <span className="legal-icon">💻</span>
                <span className="legal-text"><strong>【最佳瀏覽建議】</strong>為確保您的審稿權益與成品準確性，建議您使用桌上型電腦、筆記型電腦或平板開啟此連結。手機等微型螢幕可能因畫面縮放導致排版壓縮、細節顯示不全，進而影響您的校稿判斷。</span>
              </div>
            </div>

            <button className="btn-agree" onClick={() => setGatePassed(true)}>I Agree / 我同意並開始校稿</button>
          </div>
        </div>
      )}

      {showFinalUI && (
        <div className="modal-overlay">
          <div className="final-modal-box">
            <button className="close-modal-btn" onClick={() => setShowFinalUI(false)}>✕</button>
            <h2 className="brand-title" style={{ fontSize: '1.4rem' }}>Layout Proofing 校稿結果</h2>
            <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '10px', textAlign: 'center' }}>請點擊按鈕，系統將為您跳轉至 LINE。</p>

            {(() => {
              const summary = generateFeedbackSummary();
              const hasFeedback = !!summary;
              const busyText = isSyncing ? "☁️ 正在同步修改需求，請稍候…" : "✅ 已複製！正在開啟 LINE...";
              return (
                <div className="action-cards-container">
                  <div className="action-card">
                    {hasFeedback ? (
                      <>
                        <h3 className="card-title" style={{ color: '#ff4d4f' }}>⚠️ 您有填寫修改需求</h3>
                        <p className="card-desc" style={{ marginBottom: '5px' }}>送出後將同步給我們，並開啟 LINE 自動帶入以下內容：</p>
                        <div className="final-feedback-summary">{summary}</div>
                      </>
                    ) : (
                      <>
                        <h3 className="card-title" style={{ color: '#187880' }}>✅ 所有項目確認無誤</h3>
                        <p className="card-desc">您沒有填寫任何修改需求，送出後將通知印務團隊照此定稿版本進行製作。</p>
                      </>
                    )}
                    <button className="modal-copy-btn" onClick={() => handleSendToLine(hasFeedback ? "feedback" : "approve")} disabled={!!sendingStatus}>
                      {sendingStatus ? busyText : (hasFeedback ? "💬 送出修改需求至 LINE" : "💬 傳送確認訊息至 LINE")}
                    </button>
                  </div>
                </div>
              );
            })()}

            <p style={{fontSize: '0.75rem', color: '#888', marginTop: '15px', textAlign: 'center'}}>
              💡 提示：若您的電腦無法自動開啟 LINE，訊息已為您複製完成，請直接前往 LINE 手動貼上。
            </p>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}