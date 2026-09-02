import React, { useState, useEffect, useRef } from "react";

// 👑 辰妍國際專屬 API 金鑰
const API_URL = "https://script.google.com/macros/s/AKfycbwo8DNCpq7pXP8yH7QqNgo33vNWEfpjmpbhwqiO4-nMulEWQpCjk0M8WjyjNcy0Gy-SHQ/exec";

// ==========================================
// 🛠️ 核心樣式 (Fresh & Bright Light Mode UI)
// ==========================================
const GLOBAL_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
  /* 全局背景改為高級明亮淺灰，字體改為深灰黑 */
  body, html { background-color: #F4F7F6; color: #333333; width: 100%; height: 100%; overflow: hidden; user-select: none; }
  
  /* 後台登入區 */
  .admin-viewport { position: fixed; inset: 0; display: flex; justify-content: center; align-items: center; background: #F4F7F6; z-index: 1000; padding: 20px; }
  .admin-box { width: 100%; max-width: 500px; padding: 50px 40px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.06); text-align: center; border: 1px solid #E5E9EA; }
  .brand-logo-text { font-family: "Montserrat", sans-serif; font-weight: 600; font-size: 2.2rem; letter-spacing: 5px; color: #187880; margin-bottom: 8px; }
  .brand-subtitle { font-size: 0.75rem; letter-spacing: 3px; color: #888; margin-bottom: 25px; text-transform: uppercase; }
  
  .input-group { margin-bottom: 20px; text-align: left; }
  .input-label { display: block; color: #555; font-size: 0.85rem; margin-bottom: 8px; font-weight: 600; letter-spacing: 1px; }
  .drive-input { width: 100%; padding: 14px 15px; background: #FAFAFA; border: 1px solid #DDDDDD; color: #333333; border-radius: 6px; outline: none; font-size: 0.95rem; transition: all 0.2s ease; }
  .drive-input::placeholder { color: #aaa; }
  .drive-input:focus { background: #ffffff; border-color: #187880; box-shadow: 0 0 0 3px rgba(24, 120, 128, 0.1); }
  
  /* 簡約按鈕 */
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
  .btn-preview { flex: 1; padding: 12px; background: transparent; color: #187880; border: 1px solid #187880; border-radius: 4px; font-weight: 500; cursor: pointer; transition: 0.2s; }
  .btn-preview:hover { background: rgba(24, 120, 128, 0.05); }

  /* 主畫面框架 - 清新明亮底 */
  .app-grid-shell { display: grid; grid-template-rows: auto 1fr auto; width: 100%; height: 100vh; background: #F4F7F6; overflow: hidden; }
  .header-bar { padding: 15px 30px; background: #ffffff; border-bottom: 1px solid #E5E9EA; display: flex; justify-content: space-between; align-items: center; z-index: 10; gap: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.02);}
  .brand-logo-text-small { font-family: "Montserrat", sans-serif; font-weight: 700; font-size: 1.2rem; letter-spacing: 2px; color: #187880; white-space: nowrap; }
  
  .view-tabs { display: flex; gap: 10px; overflow-x: auto; flex: 1; justify-content: center; padding-bottom: 2px; }
  .view-tabs::-webkit-scrollbar { height: 0px; }
  .tab-btn { background: #ffffff; border: 1px solid #ddd; color: #666; padding: 8px 20px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .tab-btn:hover { border-color: #187880; color: #187880; }
  .tab-btn.active { background: rgba(24, 120, 128, 0.08); border-color: #187880; color: #187880; }

  /* 視圖舞台 */
  .stage-center-area { position: relative; display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; padding: 20px 20px 40px 20px; overflow: hidden; perspective: 2500px; }
  
  /* 左右切換箭頭 - 明亮版 */
  .nav-btn-floating { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(4px); color: #187880; border: 1px solid #187880; width: 44px; height: 44px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 1.2rem; font-weight: 300; cursor: pointer; transition: all 0.2s ease; z-index: 150; box-shadow: 0 4px 10px rgba(0,0,0,0.05);}
  .nav-btn-floating:hover:not(:disabled) { background: #187880; color: #fff; transform: translateY(-50%) scale(1.05); box-shadow: 0 6px 15px rgba(24, 120, 128, 0.2);}
  .nav-btn-floating:disabled { opacity: 0; pointer-events: none; }
  .nav-left { left: 40px; }
  .nav-right { right: 40px; }

  /* 佈局容器 */
  .album-layout-wrapper { position: relative; display: flex; flex-direction: column; align-items: flex-end; width: 86vw; transition: transform 0.8s cubic-bezier(0.645,0.045,0.355,1); }
  
  /* 👑 3D 書本容器與單頁透明化邏輯 (空氣感陰影) */
  .album-book-container { position: relative; display: flex; width: 100%; box-shadow: 0 15px 40px rgba(0,0,0,0.12); background: #fff; border-radius: 2px; transition: background 0.3s, box-shadow 0.3s; }
  .album-page-base { position: absolute; top: 0; bottom: 0; width: 50%; overflow: hidden; display: flex; justify-content: center; align-items: center; transition: opacity 0.3s; }
  .base-left { left: 0; border-radius: 3px 0 0 3px; }
  .base-right { right: 0; border-radius: 0 3px 3px 0; }

  /* 封面狀態：移除整體陰影，將陰影獨立加在右頁 */
  .album-book-container.is-front-cover { background: transparent; box-shadow: none; }
  .album-book-container.is-front-cover .base-left { opacity: 0; pointer-events: none; }
  .album-book-container.is-front-cover .base-right { background: #fff; box-shadow: 0 15px 40px rgba(0,0,0,0.12); border-radius: 4px; }
  
  /* 封底狀態：移除整體陰影，將陰影獨立加在左頁 */
  .album-book-container.is-back-cover { background: transparent; box-shadow: none; }
  .album-book-container.is-back-cover .base-right { opacity: 0; pointer-events: none; }
  .album-book-container.is-back-cover .base-left { background: #fff; box-shadow: 0 15px 40px rgba(0,0,0,0.12); border-radius: 4px; }
  
  .merch-layout-wrapper { position: relative; display: flex; flex-direction: column; align-items: flex-end; width: 86vw; max-width: 800px; transition: transform 0.4s ease; }
  .merch-image-box { position: relative; width: 100%; background: #ffffff; padding: 30px; display: flex; justify-content: center; align-items: center; border-radius: 8px; box-shadow: 0 15px 40px rgba(0,0,0,0.08); border: 1px solid #eee; }
  .merch-img-wrapper { position: relative; display: inline-block; max-width: 100%; max-height: 55vh; }
  .merch-img-wrapper img { display: block; max-width: 100%; max-height: 55vh; object-fit: contain; border-radius: 2px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); }

  /* 線框切換按鈕 - 明亮版 */
  .crop-toggle-btn-inline { margin-top: 15px; background: #ffffff; color: #187880; border: 1px solid #187880; padding: 8px 18px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .crop-toggle-btn-inline:hover { background: rgba(24, 120, 128, 0.05); }
  .crop-toggle-btn-inline.active { background: #ff4d4f; color: #fff; border-color: #ff4d4f; }

  .crop-line-overlay { position: absolute; border: 1px dashed rgba(255, 77, 79, 0.9); z-index: 50; pointer-events: none; display: flex; align-items: flex-start; justify-content: flex-end; padding: 10px; transition: opacity 0.3s; }
  .crop-warning-text { background: rgba(255, 77, 79, 0.95); color: #fff; font-size: 0.7rem; padding: 4px 8px; border-radius: 3px; font-weight: 500; letter-spacing: 1px; pointer-events: auto; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }

  /* 翻頁動畫相關 */
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

  /* 下方留言控制列 - 明亮版 */
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

  .navigation-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 30px; }
  .nav-controls { display: flex; align-items: center; flex: 1; justify-content: center; }
  .page-indicator { text-align: center; letter-spacing: 1px; color: #187880; font-weight: 700; font-size: 1rem; }
  .finish-btn { padding: 8px 25px; background: transparent; color: #187880; border: 1px solid #187880; border-radius: 20px; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: 0.2s; min-width: 120px; }
  .finish-btn:hover { background: rgba(24, 120, 128, 0.1); }
  .logout-btn { background: transparent; color: #666; border: 1px solid #ccc; padding: 6px 16px; border-radius: 20px; cursor: pointer; transition: 0.2s; font-size: 0.85rem; font-weight: 600; white-space: nowrap;}
  .logout-btn:hover { color: #187880; border-color: #187880; }

  @media (max-width: 768px) {
    .header-bar { flex-direction: column; padding: 15px; gap: 12px; }
    .view-tabs { width: 100%; justify-content: flex-start; }
    .nav-btn-floating { width: 35px; height: 35px; font-size: 1rem; }
    .nav-left { left: 10px; }
    .nav-right { right: 10px; }
    .feedback-section { flex-direction: column; gap: 10px; padding: 15px; }
    .feedback-info { width: 100%; text-align: center; }
    .page-feedback-textarea { height: 60px; }
    .navigation-bar { padding: 15px; }
    .album-layout-wrapper, .merch-layout-wrapper { width: 95vw; }
    .merch-image-box { padding: 15px; }
  }

  /* Modal 樣式 - 明亮版 */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 9999; padding: 15px; }
  .final-modal-box { position: relative; background: #ffffff; border-top: 5px solid #187880; padding: 40px; border-radius: 12px; width: 100%; max-width: 680px; box-shadow: 0 25px 60px rgba(0,0,0,0.2); }
  .close-modal-btn { position: absolute; top: 20px; right: 20px; background: transparent; border: none; color: #999; font-size: 22px; cursor: pointer; transition: 0.2s; }
  .close-modal-btn:hover { color: #333; transform: scale(1.1); }
  .legal-content-wrapper { margin: 25px 0; display: flex; flex-direction: column; gap: 12px; }
  .legal-item { display: flex; align-items: flex-start; gap: 12px; text-align: left; background: #F4F7F6; padding: 15px; border-radius: 6px; border-left: 4px solid #187880; }
  .legal-icon { font-size: 1.2rem; }
  .legal-text { font-size: 0.85rem; color: #555; line-height: 1.6; }
  
  .btn-agree { width: 100%; padding: 14px; background: #187880; color: #fff; border: none; border-radius: 6px; font-weight: 600; font-size: 1.05rem; cursor: pointer; transition: 0.2s; letter-spacing: 1px; }
  .btn-agree:hover { background: #136066; box-shadow: 0 4px 12px rgba(24, 120, 128, 0.2); }
  
  .action-cards-container { display: flex; gap: 20px; margin-top: 20px; }
  @media (max-width: 768px) { .action-cards-container { flex-direction: column; } }
  .action-card { flex: 1; background: #ffffff; border: 1px solid #E5E9EA; padding: 25px; border-radius: 8px; text-align: left; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  .card-title { margin-bottom: 8px; font-size: 1.05rem; font-weight: 600; }
  .card-desc { color: #666; font-size: 0.85rem; line-height: 1.5; margin-bottom: 20px; flex: 1; }
  .final-feedback-summary { background: #F4F7F6; color: #333; border: 1px solid #ddd; padding: 15px; border-radius: 6px; margin-bottom: 15px; max-height: 150px; overflow-y: auto; font-size: 0.85rem; white-space: pre-wrap; line-height: 1.5;}
  
  .modal-copy-btn { width: 100%; padding: 12px; background: #187880; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; }
  .modal-copy-btn.outline { background: transparent; color: #187880; border: 1px solid #187880; }
  .modal-copy-btn:hover { background: #136066; color: #fff; }
  .modal-copy-btn.outline:hover { background: rgba(24, 120, 128, 0.08); color: #187880; }
  .modal-copy-btn.success { background: #4CAF50 !important; color: #fff !important; border-color: #4CAF50 !important; }
`;

interface Photo { id: string; name: string; url: string; }

export default function App() {
  const [appMode, setAppMode] = useState<'admin' | 'viewer'>('admin');
  
  const [displayName, setDisplayName] = useState("");
  const [folderLink, setFolderLink] = useState("");
  
  const [generatedLink, setGeneratedLink] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const [currentView, setCurrentView] = useState<'album' | 'merch'>('album');
  const [albumName, setAlbumName] = useState("");
  
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [merchPhotos, setMerchPhotos] = useState<Photo[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gatePassed, setGatePassed] = useState(false);
  
  const [dynamicAspectRatio, setDynamicAspectRatio] = useState<number | null>(null); 

  const [albumSpreadIndex, setAlbumSpreadIndex] = useState(0);
  const [merchIndex, setMerchIndex] = useState(0);
  
  const [flipState, setFlipState] = useState<{ direction: "next" | "prev"; from: number; to: number; active: boolean; } | null>(null);
  
  // 👑 出血線預設顯示
  const [showAlbumCropLines, setShowAlbumCropLines] = useState(true);
  const [showMerchCropLines, setShowMerchCropLines] = useState(true);
  
  const [allFeedbacks, setAllFeedbacks] = useState<Record<string, Record<string, string>>>({});
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [showFinalUI, setShowFinalUI] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"approve" | "feedback" | null>(null);

  const albumRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nameFromUrl = params.get("name") || params.get("album");
    const idFromUrl = params.get("id");
    
    if (idFromUrl) {
      setAppMode('viewer');
      setAlbumName(nameFromUrl || "校稿預覽");
      fetchPhotos(idFromUrl);
    } else {
      setAppMode('admin');
    }
  }, []);

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
    const directLink = `${window.location.origin}${window.location.pathname}?name=${encodeURIComponent(displayName.trim())}&id=${targetId}`;
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
    navigator.clipboard.writeText(generatedLink).then(() => {
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

  const getImageRatio = (url: string): Promise<number> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
      img.onerror = () => resolve(2);
      img.src = url;
    });
  };

  const fetchWithRetry = async (url: string, retries = 3): Promise<any> => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url);
        const text = await res.text();
        if (text.startsWith('<!DOCTYPE') || text.includes('<html')) {
          if (i === retries - 1) throw new Error("Google 伺服器短暫異常，請重新整理頁面。");
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        const json = JSON.parse(text);
        if (json.error) throw new Error(json.error);
        return json;
      } catch (err: any) {
        if (i === retries - 1) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  };

  const fetchPhotos = async (folderId: string) => {
    setLoading(true); setError("");
    try {
      const rawData: Photo[] = await fetchWithRetry(`${API_URL}?folderId=${folderId}`);
      
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
      
      const sortedAlbum = filteredAlbum.sort((a, b) => {
        const getWeight = (filename = "") => {
          const n = filename.toLowerCase();
          if (n.includes("封面") || n.startsWith("000")) return -999999;
          if (n.includes("封底")) return 999999;
          const match = filename.match(/_(\d+)/);
          return (match && match[1]) ? parseInt(match[1], 10) : 0;
        };
        return getWeight(a.name) - getWeight(b.name);
      });

      if (sortedAlbum.length > 0) {
        const spreadPhoto = sortedAlbum.find((p, idx) => !checkIsSinglePage(p, idx, sortedAlbum.length));
        const targetPhoto = spreadPhoto || sortedAlbum[0];
        
        const naturalRatio = await getImageRatio(targetPhoto.url);
        const finalRatio = (targetPhoto === spreadPhoto) ? naturalRatio : (naturalRatio * 2);
        setDynamicAspectRatio(finalRatio);
      } else {
        setDynamicAspectRatio(2); 
      }

      setAlbumPhotos(sortedAlbum);
      setMerchPhotos(filteredMerch);
      setAlbumSpreadIndex(0);
      setMerchIndex(0);
      setAllFeedbacks({});
      
      if (sortedAlbum.length === 0 && filteredMerch.length > 0) {
        setCurrentView('merch');
      } else {
        setCurrentView('album');
      }

    } catch (err: any) {
      setError(err.message || "無法載入圖片。請確認您貼上的「資料夾網址」是否正確，且該資料夾已開放檢視權限。");
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (appMode === 'admin' || showFinalUI || !gatePassed) return;
      if (document.activeElement?.tagName === "TEXTAREA") return;
      
      if (currentView === 'album' && albumPhotos.length > 0) {
        if (e.code === "ArrowRight") handlePageChange(Math.min(maxSpreads, albumSpreadIndex + 1));
        if (e.code === "ArrowLeft") handlePageChange(Math.max(0, albumSpreadIndex - 1));
      } else if (currentView === 'merch' && merchPhotos.length > 0) {
        if (e.code === "ArrowRight") setMerchIndex(prev => Math.min(merchPhotos.length - 1, prev + 1));
        if (e.code === "ArrowLeft") setMerchIndex(prev => Math.max(0, prev - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appMode, currentView, albumSpreadIndex, maxSpreads, flipState, albumPhotos.length, merchPhotos.length, showFinalUI, gatePassed]);

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
    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 2000);
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

  const generateFeedbackSummary = () => {
    let summary = "";
    
    const albumFeedbacks = allFeedbacks['album'] || {};
    let albumSummary = "";
    Object.keys(albumFeedbacks).sort((a, b) => Number(a) - Number(b)).forEach(pageIdx => {
      const text = albumFeedbacks[pageIdx]?.trim();
      if (text) {
        albumSummary += `📍 [相冊 - ${getAlbumIndicatorLabel(Number(pageIdx))}]：\n   ${text}\n`;
      }
    });
    if (albumSummary) summary += `\n📖 【3D 相冊校稿】：\n${albumSummary}`;

    const merchFeedbacks = allFeedbacks['merch'] || {};
    let merchSummary = "";
    Object.keys(merchFeedbacks).forEach(photoId => {
      const text = merchFeedbacks[photoId]?.trim();
      if (text) {
        const photo = merchPhotos.find(p => p.id === photoId);
        merchSummary += `📍 [周邊 - ${photo?.name.split('.')[0]}]：\n   ${text}\n`;
      }
    });
    if (merchSummary) summary += `\n🖼️ 【周邊商品校稿】：\n${merchSummary}`;

    return summary.trim();
  };

  const handleCopyText = (type: "approve" | "feedback") => {
    let textToCopy = "";
    if (type === "approve") {
      textToCopy = `【辰妍國際 校稿確認】\n案號：${albumName}\n狀態：✅ 所有項目皆確認無誤，請安排印務製作，謝謝！`;
    } else {
      const summary = generateFeedbackSummary();
      if (!summary) { alert("您尚未填寫任何修改需求喔！"); return; }
      textToCopy = `【辰妍國際 校稿調整需求】\n案號：${albumName}\n狀態：⚠️ 希望微調內容\n\n📌 調整說明：\n${summary}`;
    }
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopyStatus(type);
      setTimeout(() => setCopyStatus(null), 3000);
    });
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
                  <button className="btn-preview" onClick={() => window.open(generatedLink, '_blank')}>
                    👁️ 預覽畫面
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </React.Fragment>
    );
  }

  if (loading || dynamicAspectRatio === null || (albumPhotos.length === 0 && merchPhotos.length === 0)) {
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

  // 👑 相冊精準裁切線
  const isCurrentViewSingle = checkIsSinglePage(albumPhotos[albumSpreadIndex], albumSpreadIndex, albumPhotos.length);
  const albumCropLineStyle = isCurrentViewSingle 
    ? (albumSpreadIndex === 0 
        ? { top: '9px', bottom: '9px', left: 'calc(50% + 18px)', right: '18px' } 
        : { top: '9px', bottom: '9px', left: '18px', right: 'calc(50% + 18px)' }) 
    : { top: '9px', bottom: '9px', left: '9px', right: '9px' };

  let containerTransform = "translateX(0%)";
  if (currentView === 'album') {
    if (albumSpreadIndex === 0 && checkIsSinglePage(albumPhotos[0], 0, albumPhotos.length)) {
      containerTransform = "translateX(-25%)"; 
    } else if (albumSpreadIndex === maxSpreads && checkIsSinglePage(albumPhotos[maxSpreads], maxSpreads, albumPhotos.length)) {
      containerTransform = "translateX(25%)";
    }
  }

  // 👑 單頁透明化引擎核心變數
  const isCoverView = albumSpreadIndex === 0 && isCurrentViewSingle && !flipState;
  const isBackCoverView = albumSpreadIndex === maxSpreads && isCurrentViewSingle && !flipState;
  const containerClasses = `album-book-container ${isCoverView ? 'is-front-cover' : ''} ${isBackCoverView ? 'is-back-cover' : ''}`;

  // 👑 智能圖像渲染引擎
  const renderPageInner = (photo: Photo | null, pageIdx: number, side: "left" | "right") => {
    if (!photo) return <div className="blank-page">Blank Page 留白</div>;
    const isSingle = checkIsSinglePage(photo, pageIdx, albumPhotos.length);

    if (isSingle) {
      if (pageIdx === 0) { // 封面顯示在右頁
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
      } else { // 封底顯示在左頁
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

    // 內頁跨頁維持原樣
    return (
      <>
        {pageIdx === 0 && <div className="cover-spine" />}
        {pageIdx !== 0 && side === "left" && <div className="shadow-right-edge" />}
        {pageIdx !== 0 && side === "right" && <div className="shadow-left-edge" />}
        <div style={{ width: "100%", height: "100%", backgroundColor: "#fff", backgroundImage: `url(${photo.url})`, backgroundSize: "200% 100%", backgroundPosition: side === "left" ? "left center" : "right center", backgroundRepeat: "no-repeat" }} />
      </>
    );
  };

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
            <button className="logout-btn" onClick={() => { setAlbumPhotos([]); setMerchPhotos([]); setGatePassed(false); setShowFinalUI(false); window.history.replaceState({}, '', window.location.pathname); }}>離開</button>
          </div>
        </header>

        {currentView === 'album' && albumPhotos.length > 0 && (
          <main className="stage-center-area">
            
            <button 
              className="nav-btn-floating nav-left" 
              onClick={() => handlePageChange(Math.max(0, albumSpreadIndex - 1))} 
              disabled={albumSpreadIndex === 0 || !!flipState}
            >
              &#10094;
            </button>

            <div className="album-layout-wrapper" style={{ maxWidth: `calc(55vh * ${dynamicAspectRatio})` }}>
              <div 
                className={containerClasses} 
                style={{ aspectRatio: dynamicAspectRatio, transform: containerTransform }}
              >
                {showAlbumCropLines && (
                  <div className="crop-line-overlay" style={albumCropLineStyle}>
                    <span className="crop-warning-text">⚠️ 裁切安全線 (紅線外側將被裁掉)</span>
                  </div>
                )}

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
              </div>
              
              <button 
                className={`crop-toggle-btn-inline ${showAlbumCropLines ? 'active' : ''}`} 
                onClick={() => setShowAlbumCropLines(!showAlbumCropLines)}
                title="模擬印刷廠的安全裁切範圍"
              >
                {showAlbumCropLines ? '👁️ 隱藏相冊出血線' : '✂️ 顯示相冊出血線'}
              </button>
            </div>

            <button 
              className="nav-btn-floating nav-right" 
              onClick={() => handlePageChange(Math.min(maxSpreads, albumSpreadIndex + 1))} 
              disabled={albumSpreadIndex === maxSpreads || !!flipState}
            >
              &#10095;
            </button>
          </main>
        )}

        {currentView === 'merch' && merchPhotos.length > 0 && (
          <main className="stage-center-area">
             
            <button 
              className="nav-btn-floating nav-left" 
              onClick={() => setMerchIndex(prev => Math.max(0, prev - 1))} 
              disabled={merchIndex === 0}
            >
              &#10094;
            </button>

            <div className="merch-layout-wrapper">
              <div className="merch-image-box">
                <div className="merch-img-wrapper">
                   {showMerchCropLines && (
                      <div className="crop-line-overlay" style={{ top: '6px', bottom: '6px', left: '6px', right: '6px', zIndex: 10 }}>
                        <span className="crop-warning-text" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>⚠️ 裁切線</span>
                      </div>
                    )}
                   <img src={merchPhotos[merchIndex].url} alt={merchPhotos[merchIndex].name} draggable="false" />
                </div>
              </div>
              
              <button 
                className={`crop-toggle-btn-inline ${showMerchCropLines ? 'active' : ''}`} 
                onClick={() => setShowMerchCropLines(!showMerchCropLines)}
                title="模擬印刷廠的安全裁切範圍"
              >
                {showMerchCropLines ? '👁️ 隱藏商品出血線' : '✂️ 顯示商品出血線'}
              </button>
            </div>

            <button 
              className="nav-btn-floating nav-right" 
              onClick={() => setMerchIndex(prev => Math.min(merchPhotos.length - 1, prev + 1))} 
              disabled={merchIndex === merchPhotos.length - 1}
            >
              &#10095;
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
                  placeholder={`請輸入針對「${getAlbumIndicatorLabel()}」的修改建議... (若無須修改請留白，翻頁會自動存檔)`}
                  value={(allFeedbacks['album'] || {})[albumSpreadIndex] || ''}
                  onChange={(e) => handleFeedbackChange(albumSpreadIndex.toString(), e.target.value)}
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
                  placeholder={`請輸入針對「${merchPhotos[merchIndex].name.split('.')[0]}」的修改建議... (若無須修改請留白，切換會自動存檔)`}
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
            <div style={{ flex: 1 }} className="spacer-left"></div>
            
            <div className="nav-controls">
              {currentView === 'album' ? (
                <div className="page-indicator">{getAlbumIndicatorLabel()}</div>
              ) : (
                <div className="page-indicator">📦 {merchPhotos[merchIndex]?.name.split('.')[0]} ({merchIndex + 1} / {merchPhotos.length})</div>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
               <button className="finish-btn" onClick={() => setShowFinalUI(true)}>完成並送出</button>
            </div>
          </div>
        </footer>

      </div>

      {!gatePassed && (
        <div className="modal-overlay">
          <div className="final-modal-box" style={{ maxWidth: '540px', textAlign: 'center' }}>
            <h2 className="brand-title" style={{ color: '#187880', fontSize: '1.6rem', marginBottom: '5px' }}>Copyright Notice<br/>著作權聲明</h2>
            
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
              {/* 👑 新增：最佳瀏覽體驗建議 */}
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
            <h2 className="brand-title" style={{ color: '#187880', textAlign: "center", marginBottom: "10px", fontSize: '1.4rem' }}>Layout Proofing 校稿結果</h2>
            <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>點擊按鈕複製訊息，直接貼回與我們的溝通群組中。</p>
            
            <div className="action-cards-container">
              <div className="action-card">
                <h3 className="card-title" style={{ color: '#187880' }}>✅ 選項一：校稿沒有問題</h3>
                <p className="card-desc">所有項目排版與周邊商品皆確認無誤，請印務團隊照此定稿版本進行製作。</p>
                <button className={`modal-copy-btn ${copyStatus === "approve" ? "success" : ""}`} onClick={() => handleCopyText("approve")}>{copyStatus === "approve" ? "✓ 已複製！(請貼至群組)" : "📋 校稿無誤，請繼續製作"}</button>
              </div>
              
              <div className="action-card">
                <h3 className="card-title" style={{ color: '#ff4d4f' }}>⚠️ 選項二：希望更換或調整</h3>
                <p className="card-desc" style={{marginBottom: '10px'}}>以下為您剛才填寫的各商品修改建議：</p>
                
                {generateFeedbackSummary() ? (
                  <div className="final-feedback-summary">
                    {generateFeedbackSummary()}
                  </div>
                ) : (
                  <div className="final-feedback-summary" style={{ fontStyle: 'italic', opacity: 0.5, textAlign: 'center', paddingTop: '40px' }}>
                    您尚未填寫任何調整建議喔！
                  </div>
                )}
                
                <button className={`modal-copy-btn outline ${copyStatus === "feedback" ? "success" : ""}`} onClick={() => handleCopyText("feedback")}>{copyStatus === "feedback" ? "✓ 已複製！(請貼至群組)" : "📋 複製調整需求清單"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}
