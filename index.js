/* ============================================================================
 * Shark Image ST — порт плагина «Shark Image 1.7.0» (Akula, TavoAI)
 * для SillyTavern. Тот же смысл: маркер [SCENE: RATIO | PROMPT], авто-промпт
 * через LLM (inline-инъекция или свой API-писатель), NovelAI / Naistera /
 * прокси, внешности персонажей (мемо), варианты картинок.
 * ==========================================================================*/
(function () {
    'use strict';

    const KEY = 'sharky2';
    const SHK_CSS = '.shk-always{border:1px solid rgba(128,128,128,.25);border-radius:8px;margin:6px 0}.shk-always-head{padding:6px 10px;background:rgba(128,128,128,.12);border-bottom:1px solid rgba(128,128,128,.25)}.shk-always-body{padding:8px}';
    const VER = '2.0.0';
    const ctx = () => { if (typeof SillyTavern === 'undefined' || !SillyTavern.getContext) throw new Error('нет SillyTavern.getContext'); return SillyTavern.getContext(); };
    const ctxOk = () => { try { const c = ctx(); return !!(c && c.extensionSettings !== undefined && c.chat); } catch (e) { return false; } };
    const c = () => ctx();

    // ---------------------------------------------------------------- мелкие хелперы
    const l = (v) => (v === null || v === undefined ? '' : String(v));
    const esc = (s) => l(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    const uid = () => 'shk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const now = () => Date.now();
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const clamp = (v, d, a, b) => { let x = parseFloat(v); if (!isFinite(x)) x = d; if (a !== undefined && x < a) x = a; if (b !== undefined && x > b) x = b; return x; };
    const ival = (v, d, a, b) => Math.round(clamp(v, d, a, b));
    const deep = (o) => { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; } };
    const jparse = (s) => { if (s && typeof s === 'object') return s; if (typeof s === 'string' && s) { try { const o = JSON.parse(s); if (o && typeof o === 'object') return o; } catch (e) { } } return null; };
    const fnv = (s) => { let h = 2166136261; s = l(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    const h36 = (s) => fnv(s).toString(36);
    const wsp = (s) => l(s).replace(/\s+/g, ' ').replace(/(\s*,\s*)+/g, ', ').replace(/^[\s,]+|[\s,]+$/g, '');
    const cut = (s, n) => { s = l(s); if (s.length <= n) return s; let x = s.slice(0, n); const i = x.lastIndexOf(','); return (i > 0.5 * n ? x.slice(0, i) : x).replace(/[\s,]+$/, ''); };
    const isHttps = (u) => /^https:\/\//i.test(l(u).trim());
    const mkErr = (code, msg) => { const e = new Error(msg); e.code = code; return e; };

    // нормализация и слияние тегов
    const w = wsp;
    const xmerge = (a, b) => { a = w(a); b = w(b); if (!b) return a; if (!a) return b; const n = {}; a.split(',').forEach((t) => { n[t.trim().toLowerCase()] = 1; }); const r = b.split(',').map((t) => t.trim()).filter((t) => t && !n[t.toLowerCase()]); return r.length ? a + ', ' + r.join(', ') : a; };
    const TEXT_RX = /(^|[,\n]\s*)text\s*:/i;
    const E = (s) => { s = l(s); const m = TEXT_RX.exec(s); if (!m) return { tags: s, text: '' }; const tags = s.slice(0, m.index).replace(/[\s,]+$/, ''); const text = s.slice(m.index + m[0].length).replace(/^[\s,]+|[\s,]+$/g, ''); if (text.length > 140) return { tags: [tags, text].filter(Boolean).join(', '), text: '' }; if (/[Ѐ-ӿ]/.test(text)) return { tags, text: '' }; return { tags, text }; };
    const O = (tags, text) => { text = l(text).replace(/[\[\]|]/g, ' ').replace(/\s+/g, ' ').trim(); tags = l(tags).replace(/[\s,]+$/, ''); return text ? (tags ? tags + ', ' : '') + 'Text: ' + text : tags; };
    const I = (tags, add) => { const e = E(tags); return O(xmerge(e.tags, add), e.text); };
    const hasText = (s) => { const t = E(s); return !!t.text || /(^|,)\s*(speech bubble|thought bubble|sound effects|english text)\s*(,|$)/i.test(t.tags); };
    const normTag = (s) => l(s).toLowerCase().replace(/^\s*-?\d*\.?\d+::/, '').replace(/::\s*$/, '').replace(/[{}\[\]()]/g, '').replace(/\s+/g, ' ').trim();
    const NO_TEXT_TAGS = { text: 1, 'english text': 1, 'speech bubble': 1, 'thought bubble': 1, 'sound effects': 1, onomatopoeia: 1 };
    const COMIC_RX = /(^|,)\s*(comic|comic page|4koma|2koma|sticker sheet|splash page|\d+ (panels|stickers|frames))\s*(,|$)/i;
    const MULTI_RX = { 'multiple views': 1, 'multiple panels': 1, panels: 1, comic: 1, '4koma': 1, '2koma': 1, 'split screen': 1, sticker: 1, stickers: 1 };
    // негатив: убрать теги, которые уже есть в промпте (и лишнее для комиксов/текста)
    function negFilter(neg, promptTags, charTags) {
        const p = E(promptTags), a = {}, multi = COMIC_RX.test(p.tags);
        const have = [p.tags].concat(charTags || []).join(',').split(',').forEach((t) => { const n = normTag(t); if (n) a[n] = 1; });
        const hasT = hasText(promptTags);
        return l(neg).split(',').filter((t) => { const n = normTag(t); return n && !a[n] && !(hasT && NO_TEXT_TAGS[n]) && !(multi && MULTI_RX[n]); }).map((t) => t.trim()).join(', ');
    }

    // ---------------------------------------------------------------- отладочные плашки
    function bootLog(msg) {
        try {
            if (typeof toastr !== 'undefined') { toastr.info(msg, '🦈 Sharky ' + VER); return; }
            const d = document.createElement('div');
            d.textContent = '🦈 ' + msg;
            d.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99999;background:#5b2a86;color:#fff;padding:8px 12px;border-radius:8px;font:13px monospace;box-shadow:0 2px 8px #000';
            document.body.appendChild(d);
            setTimeout(() => d.remove(), 15000);
        } catch (e) { console.log('[sharkimage boot]', msg, e); }
    }
    function bootErr(where, e) {
        bootLog('ОШИБКА в ' + where + ': ' + (e && e.message ? e.message : e));
        console.error('[sharkimage]', where, e);
    }
    bootLog('скрипт прочитан, v' + VER);

    // ---------------------------------------------------------------- конфигурация
    const DEF = {
        v: 1,
        mode: 'auto',            // auto | manual | off
        writer: 'inline',        // inline | api
        apiId: '',
        promptId: 'p_scene',
        promptIdV4: 'p_v4',
        ctxN: 4,
        refs: true,
        memo: true,
        provider: 'nai',         // nai | naiproxy | naistera
        nai: { model: 'nai-diffusion-5-full', size: 'normal', quality: 'standard', uc: 'heavy', steps: 28, scale: 5, sampler: 'k_euler_ancestral', noise: 'karras' },
        ns: { model: 'novelai-v4.5', quality: 'standard', cat: [] },
        proxy: { url: '', sendTok: false },
        styleId: 's_std',
        styleIdV4: 's_std4',
        negId: 'n_basic',
        negIdV4: 'n_basic4',
        naiToken: '',
        nsToken: '',
        api: { list: [] },
    };

    const DEF_LIB = {
        styles: [
            { id: 's_std', name: 'Стандарт (V5)', tags: 'masterpiece, best quality, highly detailed, very aesthetic, absurdres', img: '', fam: 'v5' },
            { id: 's_std4', name: 'Стандарт (V4)', tags: 'masterpiece, best quality, very aesthetic, absurdres, highly detailed, sharp focus', img: '', fam: 'v4' },
            { id: 's_mix4', name: 'Микс художников (V4)', tags: '[0.6::lart_art1 ::, 1.6::zero_q_0q::, 0.7::etceteraart::, 1.3::dang0_23 ::, 0.9::sasha_chii::, realistic, highres_quality, ultra_detail, sidelighting, volumetric_shadow, nyantcha, 1.5::obj Shep::, 0.6::kagoya1219 ::, 1.8::pigeon666 ::, 0.7::96yottea::, 0.8::aoma xuanzexuexi::, 0.5::vlfdus 0 ::].', img: '', fam: 'v4' },
        ],
        negs: [
            { id: 'n_basic', name: 'Базовый (V5)', text: 'bad anatomy, bad hands, extra fingers, fewer fingers, missing fingers, fused fingers, extra limbs, extra arms, extra legs, malformed limbs, deformed, bad proportions, long neck, cross-eyed, watermark, signature', fam: 'v5' },
            { id: 'n_basic4', name: 'Базовый (V4)', text: 'bad anatomy, bad hands, extra fingers, fewer fingers, missing fingers, fused fingers, extra limbs, extra arms, extra legs, malformed limbs, deformed, bad proportions, long neck, cross-eyed, watermark, signature', fam: 'v4' },
        ],
        prompts: [
            { id: 'p_scene', name: 'Сцена (V5)', kind: 'scene', text: '', builtin: 1 },
            { id: 'p_comic', name: 'Комикс / манга', kind: 'comic', text: '', builtin: 1 },
            { id: 'p_marvel', name: 'Супергеройский комикс', kind: 'custom', text: '', builtin: 1 },
            { id: 'p_chibi', name: 'Чиби-страница', kind: 'custom', text: '', builtin: 1 },
            { id: 'p_v4', name: 'Сцена NovelAI V4 / Naistera', kind: 'v4', text: '', builtin: 1 },
        ],
    };
    // ---------------------------------------------------------------- шаблоны промптов (из оригинального плагина)
    const TPL = {
        scene: "SCENE IMAGE — end every reply with ONE marker line.\n\nMARKER\n- It is the very last line of your output, nothing after it:\n[SCENE: RATIO | PROMPT]\n- RATIO is exactly one of 1:1, 2:3, 3:2, 16:9, 9:16.\n- PROMPT is ONE line of English NovelAI / Danbooru tags: no line breaks, no square brackets, no quotation marks, no markdown, no URL. Use | only to separate sections and # only in contact tags like source#hug; never escape them.\n- Do not write quality tags, art styles, artist names or negative tags: the engine adds the user style, quality tags and negative prompt by itself.\n\nWHAT TO DRAW\n- The CURRENT moment of the story: who is visible, what they do, their expressions, clothing in its current state, place, time of day, weather, key props.\n- Never invent events, people or objects; fill gaps only with the minimum that fits.\n- Character profiles and the CHARACTERS list define looks; the latest story text defines action, mood and the state of clothing.\n\nRATIO\n2:3 portrait, one or two people from the waist up; 9:16 one standing figure in full body; 3:2 two or three people, rooms, action; 16:9 landscapes, crowds, wide action; 1:1 one centered subject or a close-up.\n\nSTRUCTURE\nGLOBAL | CHARACTER 1 | CHARACTER 2 ...\nGLOBAL, in this order:\n1. Count tags for visible characters only, each a separate tag: 1girl; 1boy, 1girl; 2girls; 2boys, 1girl (no reflections, photos or statues).\n2. Shot, 1-2 tags: close-up, portrait, upper body, cowboy shot, full body, wide shot, from above, from below, from side, from behind, dutch angle.\n3. Place, 2-5 concrete tags: indoors, cafe, wooden table, window, rain, forest, city street, night.\n4. Light, 1-2 tags from the scene: sunlight, window light, sunset, moonlight, candlelight, neon lights, dim lighting, backlighting, rim light, dramatic shadows.\n5. Color, exactly 1 tag matching light and mood: warm colors, cool colors, muted colors, pastel colors, high contrast. A moonlit night is never warm colors.\nNo hair, eyes, body or clothing in GLOBAL.\n\nCHARACTER BLOCKS\nOne block per visible character, max 6; extra people go into GLOBAL as crowd or background people.\nOrder inside a block: @Name, girl or boy, position, appearance, clothing, pose, action, expression, gaze.\n- @Name only when a CHARACTERS list is given: the exact name from it, or @other. The engine removes the label; apart from it, names of original characters never appear in the prompt.\n- girl or boy without numbers, then position: left side, right side, center, foreground, background.\n- Appearance: hair color, hair length, hairstyle, eye color, body type, skin tone, notable features. If the CHARACTERS list gives appearance or outfit tags, copy them exactly and never contradict them.\n- Clothing exactly as it is now (wet, torn, unbuttoned, taken off) with colors.\n- Franchise character: Name (series) right after girl or boy, plus the full appearance anyway.\n- Contact uses raw prefixes in each owner block: source#hug and target#hug, mutual#kissing, source#holding hands.\n- Never merge two people into one block; never give one person the traits or clothes of another.\n\nGAZE\nEyes stay inside the scene: looking at another, looking at object, looking down, looking away, closed eyes. Use looking at viewer only when a character addresses the reader or the scene is pov.\n\nTEXT\nNo lettering: no speech bubbles, no captions, no readable signs.\n\nADULTS AND NSFW\n- Everyone is an adult: never childlike tags, never ages or heights.\n- Only when the current moment explicitly contains sex or nudity: add nsfw, explicit, uncensored to GLOBAL and describe the established position, contact and clothing state with plain Danbooru tags in the owners blocks. Never go beyond the story; romance, kissing or closeness alone are not sexual.\n\nFORM\nShort Danbooru tags of 1-3 words separated by commas, no sentences. 350-800 characters. If it gets longer, drop background tags first, never appearance.\n\nExample, the very last line of a reply:\n[SCENE: 3:2 | 1boy, 1girl, upper body, indoors, cafe, wooden table, rain on window, window light, cool colors | @Kai, boy, left side, short black hair, grey eyes, slim, white shirt, rolled sleeves, elbow on table, chin rest, smile, looking at another | @Mira, girl, right side, long brown hair, blue eyes, green dress, holding cup, blush, looking at another]",
        comic: "MANGA / MANHWA COMIC PAGE — end every reply with ONE marker line.\n\nMARKER\n- It is the very last line of your output, nothing after it:\n[SCENE: RATIO | PROMPT]\n- RATIO is exactly one of 1:1, 2:3, 3:2, 16:9, 9:16 (pick it in step 2).\n- PROMPT is ONE line in English: no line breaks, no square brackets, no quotation marks, no markdown, no URL. Use | only to separate sections and # only in contact tags like source#hug; never escape them.\n- Do not write quality tags, art styles, artist names or negative tags: the engine adds the user style, quality tags and negative prompt by itself.\n\nSTEP 1. READ THE BEAT (silently, never write it in the reply)\nDecide which beat the current moment is: dialogue, tension, action, romance, comedy, reveal, flashback or quiet mood. Draw only what the story established; never invent events, powers, people or lines. Character profiles and the CHARACTERS list define looks; the latest story text defines action and the state of clothing.\n\nSTEP 2. PICK RATIO AND LAYOUT\nMatch the beat and keep pages varied. If a PREVIOUS IMAGE line is given, do not repeat its ratio and layout unless only that one fits the beat.\n- dialogue: 2:3, 3-4 panels; top wide panel shows the place, then alternating close-ups, a reaction close-up at the bottom.\n- tension, confrontation: 2:3 or 9:16, 3 panels; slanted panel borders, extreme close-up of eyes, shadow over eyes, black gutters.\n- action, fight, chase: 3:2 or 16:9 spread, or 2:3; 2-4 diagonal panels, a character breaking the panel border, speed lines, impact frame, motion blur.\n- romance, tender moment: 2:3 or 9:16, 3 panels; borderless panels, soft focus, close-up of hands, sparkles, floating petals or light particles.\n- comedy, gag: 9:16 4koma with four equal panels stacked, or 1:1 2x2 panel grid, or 2:3 with ONE chibi inset reaction; sweatdrop, flying sweatdrops, shocked face.\n- reveal, climax: 2:3 splash page; one huge panel plus 1-2 small inset panels in the corners, emphasis lines.\n- slow buildup, manhwa scroll: 9:16, 3 panels stacked vertically, no panel borders, wide white gaps between panels.\n- flashback: one desaturated panel with blurred edges inside any layout, black gutters around it.\n- quiet atmosphere, travel: 16:9 or 3:2, one wide cinematic panel plus one small close-up inset.\nAlways 2-5 panels. Name each panel by its position (top panel, middle left panel, bottom right panel, inset panel) and give it a shot: wide shot, medium shot, close-up, extreme close-up, from above, from below, over the shoulder, dutch angle.\n\nSTEP 3. ADD EFFECTS\n2-4 effects that fit the beat, each tied to its panel: speed lines, motion lines, emphasis lines, impact, shockwave, screentone, sparkles, light particles, floating petals, shaded face, shadow over eyes, sweatdrop, anger vein, blush, trembling, heart, dramatic shadows, rim light, lens flare, motion blur.\n\nGLOBAL SECTION, in this order\ncount tags of visible characters, each a separate tag (1girl; 1boy, 1girl; 2girls), comic, number of panels, layout and gutters, every panel with position + shot + who + what happens, effects, place, 1-2 lighting tags, 1 color tag (warm colors, cool colors, muted colors, pastel colors, high contrast, desaturated), bubble placement, and LAST the Text: part.\nInside GLOBAL call people by gender and side (the girl on the left, the man), never by name. No hair, eyes or clothing in GLOBAL.\n\nCHARACTER BLOCKS\nOne block per visible character, max 6. Order inside a block: @Name, girl or boy, position, appearance, current clothing, actions and expressions per panel, gaze.\n- @Name only when a CHARACTERS list is given: the exact name from it, or @other. The engine removes the label; apart from it, names of original characters never appear in the prompt.\n- Appearance: hair color and length, hairstyle, eye color, body type, skin tone, notable features. If the CHARACTERS list gives appearance or outfit tags, copy them exactly.\n- A character seen in several panels keeps ONE block that lists the panel actions (top panel smiling, bottom panel crying).\n- Contact uses raw prefixes in each owner block: source#hug and target#hug, mutual#kissing.\n- Franchise character: Name (series) right after girl or boy, plus the full appearance anyway.\n- Never merge two people into one block; never give one person the traits or clothes of another.\n- Gaze stays inside the story: looking at another, looking at object, looking away. No looking at viewer unless a character addresses the reader.\n\nSPEECH BUBBLES AND TEXT\nNovelAI draws only Latin letters: Russian turns into scribbles, and every tag written after the lettering gets drawn as letters too.\n- At most 2 speech bubbles per page plus at most 1 sound effect.\n- Bubble text is a short ENGLISH translation of a real line from the current moment: max 5 words per bubble, UPPERCASE, no names. Never invent lines; a silent moment gets no bubbles.\n- In GLOBAL say where each bubble is: speech bubble in the top panel, tail pointing to the girl on the left. Thought bubble only for established inner thoughts.\n- All lettering goes into ONE Text: part at the very END of GLOBAL, right before the first |, for example Text: YOU CAME BACK. Never write text: inside a character block.\n- No dialogue: no bubble tags and no Text: part.\n\nCHIBI\nAt most one small chibi inset per page, only for a comedy reaction; never in tense, sad or adult scenes.\n\nADULTS AND NSFW\n- Everyone is an adult: never childlike tags, never ages or heights.\n- Only when the current moment explicitly contains sex: add nsfw, explicit, uncensored to GLOBAL. Keep exactly the established explicitness, never escalate, never infer it from romance, kissing or nudity alone.\n- Plain Danbooru terms for the established act, position, contact and clothing state (naked, clothes pulled down, shirt lifted), tied to the panels where they are visible. A tiny contact point may get one close-up inset; an established hidden penetration may get one small x-ray inset. Anatomy and clothing state stay the same in every panel.\n\nFORM\nShort tags and panel phrases of up to 10 words, separated by commas, no full sentences. The whole PROMPT is 500-1300 characters; if it gets longer, shorten panel phrases and background first, never appearance or the Text: part.\n\nCHECK SILENTLY BEFORE WRITING\nOne line at the very end; the ratio is allowed and fits the layout; 2-5 panels with positions and shots; the layout differs from the PREVIOUS IMAGE when possible; lighting and color present; one block per person; at most 2 bubbles of short English UPPERCASE text; Text: is the last part of GLOBAL; no names, quotation marks or brackets.\n\nExample, dialogue beat:\n[SCENE: 2:3 | 1boy, 1girl, comic, 4 panels, white gutters, top panel wide shot of a rainy night street, middle left panel close-up of the girl on the left, middle right panel close-up of the man, bottom panel extreme close-up of his eyes, emphasis lines, rain, street lights, cool colors, speech bubble in the middle left panel, tail pointing to the girl, Text: YOU CAME BACK | @Mira, girl, left side, long silver hair, blue eyes, slim, pale skin, black coat, middle left panel teary eyes, looking at another | @Kai, boy, right side, short black hair, grey eyes, tall, dark hoodie, middle right panel surprised, bottom panel narrowed eyes, looking at another]\n\nExample, action beat:\n[SCENE: 3:2 | 1boy, 1girl, comic, 3 panels, diagonal panel borders, left panel full body of the man leaping from a rooftop, from below, speed lines, top right panel close-up of the girl shouting, bottom right panel impact frame of his landing, shockwave, flying debris, night city, neon lights, high contrast, speech bubble in the top right panel, tail pointing to the girl, sound effects, Text: JUMP NOW! CRASH | @Kai, boy, center, short black hair, grey eyes, black jacket, left panel leaping, bottom right panel landing on one knee, determined expression | @Mira, girl, right side, long silver hair, blue eyes, white coat, top right panel shouting, reaching out, looking at another]",
        marvel: "SUPERHERO ACTION COMIC PAGE — end every reply with ONE marker line.\n\nMARKER\n- It is the very last line of your output, nothing after it:\n[SCENE: RATIO | PROMPT]\n- RATIO is exactly one of 1:1, 2:3, 3:2, 16:9, 9:16 (pick it in step 1).\n- PROMPT is ONE line in English: no line breaks, no square brackets, no quotation marks, no markdown, no URL. Use | only to separate sections and # only in contact tags like source#hug; never escape them.\n- Do not write quality tags, art styles, artist, franchise or publisher names, or negative tags: the engine adds the user style, quality tags and negative prompt by itself.\n\nTHE FEEL\nLoud, kinetic American superhero comic energy: extreme angles and foreshortening, splash panels, tilted and overlapping panels, figures bursting out of panel borders, big sound effects, impact bursts, halftone dots, hard shadows, saturated high contrast color.\nThe energy comes from camera, panel shapes and effects. Never invent powers, villains, explosions or fights the story does not have, and never add costumes, capes or masks that were not established. A quiet talk still gets low angles, close-ups and hard light, but no explosions.\n\nSTEP 1. BEAT TO RATIO AND LAYOUT (decide silently, never write it in the reply)\nMatch the beat and keep pages varied. If a PREVIOUS IMAGE line is given, do not repeat its ratio and layout unless only that one fits the beat.\n- big moment (hit, jump, crash, transformation, entrance): 2:3 splash page; one full-page panel, the figure bursting out of the panel border, 1-2 small inset panels with reactions.\n- fight or chase: 2:3 or 3:2; 3-5 staggered panels with diagonal borders, the last panel the biggest.\n- wide clash, destroyed street, crowd: 16:9; one widescreen panel on top and 2 small panels below.\n- fall, flight, climb, tall building: 9:16; one tall panel seen from below or from above.\n- standoff: 2:3; three thin vertical panels with extreme close-ups of eyes and hands, then one wide panel.\n- dialogue or plan: 2:3 or 1:1; 3-4 panels, low angle close-ups, rim light, one silhouette panel.\n- emotional peak: 2:3; one big close-up panel with heavy shadows plus a small inset.\n1-5 panels. Every panel gets position + shot (extreme close-up, close-up, medium shot, full body, wide shot) + angle (from below, from above, dutch angle, foreshortening, over the shoulder).\n\nSTEP 2. EFFECTS\n3-5 effects, only for what really happens:\n- motion: speed lines, motion lines, motion blur, afterimage\n- impact: impact burst, shockwave, flying debris, cracked ground, dust cloud, sparks, shattered glass\n- energy, only if the story has powers or magic: glowing aura, energy beam, crackling energy, lightning, glowing eyes\n- atmosphere: halftone, hard shadows, rim light, backlighting, lens flare, smoke; explosion only when something explodes\n- color: high contrast plus one of saturated colors, red and blue tones, warm tones, cold tones\n\nGLOBAL SECTION, in this order\ncount tags of visible characters, each a separate tag (1boy; 1boy, 1girl; 2boys), comic, number of panels, layout, every panel with position + shot + angle + who + action, effects, place, 1-2 lighting tags, color tags, lettering placement, and LAST the Text: part.\nInside GLOBAL call people by gender and side (the man on the left), never by name. No hair, eyes or clothing in GLOBAL.\n\nCHARACTER BLOCKS\nOne block per visible character, max 6. Order inside a block: @Name, girl or boy, position, appearance, current clothing, dynamic pose and action per panel, expression, gaze.\n- @Name only when a CHARACTERS list is given: the exact name from it, or @other. The engine removes the label; apart from it, names of original characters never appear in the prompt.\n- Appearance: copy the CHARACTERS tags exactly; otherwise hair color and length, hairstyle, eye color, body type, skin tone, notable features.\n- Poses only from the story: dynamic pose, mid-air, leaping, punching, kicking, landing on one knee, running, aiming, shielding face, clenched fist, arms crossed.\n- One block per person even across panels; never merge people or swap traits.\n- Gaze stays inside the scene: looking at another, looking at object, looking up. No looking at viewer unless a character addresses the reader.\n\nLETTERING\nNovelAI draws only Latin letters, and every tag written after the lettering gets drawn as letters too.\n- One big English sound effect in UPPERCASE that matches the action (WHAM, BOOM, KRAK, THWIP, CRASH, BAM; SHHH for silence) plus at most one speech bubble of max 5 English words translated from a real line.\n- In GLOBAL describe placement: sound effects, large bold lettering in the main panel; speech bubble in its panel, tail pointing to the speaker.\n- All letters go into ONE Text: part at the very END of GLOBAL, right before the first |, for example Text: WHAM! GET DOWN. Never write text: inside a character block.\n- Nothing loud happens and nobody speaks: no lettering and no Text: part.\n\nADULTS\nEveryone is an adult: never childlike tags, ages or heights. This format stays non-explicit: in a sexual moment draw a dramatic tasteful panel (faces in close-up, hands, silhouettes, shadows) without nudity.\n\nFORM\nShort tags and panel phrases of up to 10 words, separated by commas, no full sentences. The whole PROMPT is 500-1300 characters; if it gets longer, shorten panel phrases and background first, never appearance or the Text: part.\n\nCHECK SILENTLY BEFORE WRITING\nOne line at the very end; the ratio fits the layout and differs from the PREVIOUS IMAGE when possible; 1-5 panels with position, shot and angle; at least one extreme angle; effects only for real events; lighting and color present; one block per person; lettering is short English UPPERCASE and Text: is the last part of GLOBAL; no names, quotation marks or brackets.\n\nExample:\n[SCENE: 2:3 | 1boy, 1girl, comic, 3 panels, splash page, main panel full body of the man kicking through a door, foreshortening, from below, bursting out of the panel border, flying debris, impact burst, speed lines, top inset panel close-up of the girl gasping, bottom inset panel his clenched fist, halftone, warehouse, night, backlighting, hard shadows, high contrast, red and blue tones, sound effects, large bold lettering in the main panel, Text: KRAK | @Kai, boy, center, short black hair, grey eyes, muscular, black jacket, torn sleeve, main panel kicking the door, furious expression, looking at another | @Mira, girl, top inset panel, long silver hair, blue eyes, white coat, gasping, hand over mouth, looking at another]",
        chibi: "CHIBI PAGE: STICKERS OR MINI FRAMES — end every reply with ONE marker line.\n\nMARKER\n- It is the very last line of your output, nothing after it:\n[SCENE: RATIO | PROMPT]\n- RATIO is exactly one of 1:1, 2:3, 3:2, 16:9, 9:16 (pick it in step 1).\n- PROMPT is ONE line in English: no line breaks, no square brackets, no quotation marks, no markdown, no URL. Use | only to separate sections and # only in contact tags like source#hug; never escape them.\n- Do not write quality tags, art styles, artist names or negative tags: the engine adds the user style, quality tags and negative prompt by itself.\n\nTHE IDEA\nCute, carefully detailed chibi versions of the story characters acting out the current moment: big heads, small bodies, huge expressive eyes, detailed miniature outfits, accessories and props. Every chibi is recognizable at once: same hair color and style, eye color, outfit colors and accessories as in the story.\nChibi pages are always wholesome and SFW. The characters are adults drawn in chibi style: never childlike tags (child, loli, shota, toddler, kindergarten), never ages. If the moment is sexual or graphic, show a cute safe reaction instead: blushing, hiding face, hearts, steam puffs, a comic dust cloud, everyone fully clothed.\n\nSTEP 1. PICK A FORMAT (decide silently, never write it in the reply)\nMatch the moment and vary between replies. If a PREVIOUS IMAGE line is given, pick another format unless only that one fits.\n- sticker sheet: 1:1; 3-6 chibi stickers with white outline on a simple pastel background, each sticker a different reaction or pose from this moment (happy, pouting, crying, angry, sleepy, love-struck, panicking, proud, thinking). Add multiple views when one character appears several times.\n- mini frames strip: 3:2 or 16:9; 3-4 small rounded frames in a row, each a tiny step of the moment in reading order, cute frame borders.\n- vertical mini frames: 2:3 or 9:16; 3-4 rounded frames stacked top to bottom.\n- chibi scene: 3:2 or 1:1; one cozy miniature diorama of the real location with small props and all characters in it.\n- reaction duo: 1:1; two big chibi heads side by side reacting to each other.\nName every sticker or frame by position (top left sticker, center sticker, first frame, last frame) and say who is in it, what they do and their expression.\n\nSTEP 2. MAKE IT DETAILED\n- Every chibi: chibi, full body, detailed eyes, glossy hair, detailed clothes, clean outline, soft shading.\n- Expressions varied and exaggerated: sparkling eyes, tears, pout, puffed cheeks, wavy mouth, blush stickers, sweatdrop, anger vein, heart, music note, sparkle, steam.\n- Props and setting from the story in miniature: cups, books, swords, pillows, rain, snow.\n- Light, 1 tag: soft lighting, sunlight, warm light, moonlight. Color, 1 tag: pastel colors or warm colors; night scenes may use cool colors.\n\nGLOBAL SECTION, in this order\ncount tags of visible characters, each a separate tag (1girl; 1boy, 1girl; 2girls), chibi, the format (sticker sheet, 4 stickers, or comic, 3 panels, rounded frames), every sticker or frame with position + who + action + expression, background, light, color, and LAST the optional Text: part.\nInside GLOBAL call people by gender and side, never by name. No hair, eyes or clothing in GLOBAL.\n\nCHARACTER BLOCKS\nOne block per character, max 6, covering all stickers or frames of that character. Order inside a block: @Name, girl or boy, chibi, appearance, current clothing, actions and expressions per sticker or frame.\n- @Name only when a CHARACTERS list is given: the exact name from it, or @other. The engine removes the label; apart from it, names of original characters never appear in the prompt.\n- Appearance: copy the CHARACTERS tags exactly; otherwise hair color and length, hairstyle, eye color, skin tone, notable features.\n- Contact uses raw prefixes: source#hug and target#hug, mutual#holding hands.\n- Never merge people or swap traits.\n\nLETTERING (optional, rare)\nAt most 2 tiny English words in total as sticker captions (YAY, HMPH, SORRY, LOVE YOU), UPPERCASE, all in ONE Text: part at the very END of GLOBAL, right before the first |. Usually no text at all; never text: inside a character block.\n\nFORM\nShort tags and sticker phrases of up to 10 words, separated by commas, no full sentences. The whole PROMPT is 400-1200 characters; if it gets longer, shorten sticker phrases and background first, never appearance.\n\nCHECK SILENTLY BEFORE WRITING\nOne line at the very end; the ratio fits the format; the format differs from the PREVIOUS IMAGE when possible; every chibi detailed and recognizable; everyone clothed and wholesome; one block per person; Text: only if needed and last in GLOBAL; no names, quotation marks or brackets.\n\nExample:\n[SCENE: 1:1 | 1boy, 1girl, chibi, sticker sheet, 4 stickers, multiple views, white outline, simple background, top left sticker the girl pouting with puffed cheeks, top right sticker the man laughing, bottom left sticker the girl hugging a pillow, bottom right sticker both sharing a cup of cocoa with hearts, soft lighting, pastel colors | @Mira, girl, chibi, long silver hair, blue eyes, white sweater, pouting, hugging pillow, sparkling eyes | @Kai, boy, chibi, short black hair, grey eyes, dark hoodie, laughing, holding cup, blush]",
        v4: "NOVELAI V4 SCENE (NAISTERA) — end every reply with ONE marker line.\n\nMARKER\n- It is the very last line of your output, nothing after it:\n[SCENE: RATIO | PROMPT]\n- RATIO is exactly one of 1:1, 2:3, 3:2, 16:9, 9:16.\n- PROMPT is ONE continuous line of English NovelAI V4 / Danbooru tags: no line breaks, no square brackets, no quotation marks or apostrophes, no markdown, no URL. Do not URL-encode anything: write spaces, commas, | and # as they are. Use | only to separate sections and # only in action tags like source#hug.\n- Do not write quality tags, art styles, artist names or negative tags: the engine adds the user style, quality tags and negative prompt by itself.\n\nSCENE ANALYSIS\n- Draw the CURRENT moment of the story exactly: visible characters, current actions, emotions, clothing in its current state, location, time, weather, props and atmosphere.\n- Do not invent a new scene when the current one is clear; if details are missing, infer only the minimum that fits.\n- Character profiles and the CHARACTERS list define looks; the latest story text defines action and the state of clothing.\n\nSTRUCTURE\nGLOBAL | CHARACTER 1 | CHARACTER 2 ...\nGLOBAL contains only these parts, in this order:\n1. Count tags of visible characters, each a separate tag: 1girl; 1boy, 1girl; 2girls; 2boys, 1girl. Count only characters actually visible: never unseen speakers, memories, statues, reflections, posters, paintings, dolls, shadows or background silhouettes.\n2. Composition, 1-2 tags: cowboy shot, upper body, full body, portrait, close-up, wide shot, pov, from above, from below, dutch angle, rule of thirds, cinematic composition, dynamic framing.\n3. Background, 2-5 concrete tags: bedroom, bed, window, couch, table, shower, city street, shrine, forest, rain, snow, fog, furniture, props, architecture.\n4. Lighting, 1-2 tags: soft window light, moonlight, neon lighting, candlelight, overcast daylight, rim light, backlight, dramatic shadows.\n5. Color mood, exactly 1 tag: natural colors, warm colors, cool colors, muted colors, rich colors, high contrast, low contrast, desaturated.\nNever put hair, eyes, body, clothing or actions of a person into GLOBAL.\n\nCHARACTER BLOCKS\nOne self-contained block per visible character, max 6. Order inside a block:\n@Name, girl or boy, position, appearance, clothing, pose, action, expression, gaze.\n- @Name only when a CHARACTERS list is given: the exact name from it, or @other. The engine removes the label; apart from it, names of original characters never appear in the prompt.\n- girl or boy without numbers, then a spatial anchor: left side, right side, center, foreground, background.\n- FULL appearance in every block, never shortened: exact hair color, hair length (short hair, long hair), hairstyle (ponytail, braids, messy hair, straight hair, curly hair, bangs, blunt bangs), eye color, body type (slender, muscular, curvy), skin tone and notable features. If the CHARACTERS list gives appearance tags, copy them exactly and never contradict them.\n- Clothing exactly as it is now: every piece with its color, or its state (unbuttoned, wet, torn, removed).\n- Franchise character (anime, manga, manhwa, game, series, film): Name (series) as the first tag after girl or boy, for example Makima (chainsaw man), plus the full visible appearance anyway.\n- Interactions use action tags inside the owners blocks: source#hug and target#hug, mutual#kissing, source#holding hands.\n- Never merge two people into one block; never give one person the traits or clothes of another.\n- Gaze stays inside the scene: looking at another, looking at object, looking down, closed eyes. Use looking at viewer only for pov or when a character addresses the reader.\n\nADULTS AND NSFW\n- Everyone is an adult: never childlike tags, never ages or heights.\n- Only when the current moment explicitly contains sex or nudity: add nsfw, explicit, uncensored to GLOBAL and name exactly what the story established, in the owners blocks: the act (vaginal, oral, handjob...), the position (missionary, doggystyle, cowgirl position, standing sex, against wall...), the visible intimate body parts and fluids or effects (sweat, blush, tears). For intimate scenes prefer cowboy shot, full body or pov.\n- Never go beyond the story: romance, kissing or closeness alone are not sexual. No censorship words.\n\nFORM\nShort visual tags of 1-4 words separated by commas; no sentences and no vague or metaphorical phrases (beautiful atmosphere, perfect vibe). 400-900 characters. If it gets longer, drop background tags first, never appearance.\n\nExample, the very last line of a reply:\n[SCENE: 2:3 | 1boy, 1girl, cowboy shot, rule of thirds, indoors, bedroom, bed, window, night, moonlight, rim light, cool colors | @Kai, boy, left side, short black hair, messy hair, grey eyes, tall, muscular, pale skin, white shirt, unbuttoned shirt, black pants, sitting on bed, source#hug, gentle smile, looking at another | @Mira, girl, right side, long silver hair, straight hair, blunt bangs, blue eyes, slender, fair skin, oversized black hoodie, sleeves past fingers, target#hug, blush, closed eyes]"
    };
    // ---------------------------------------------------------------- хранилище настроек
    function S() {
        const es = ctx().extensionSettings;
        if (!es[KEY]) es[KEY] = deep(DEF);
        const s = es[KEY];
        // доклеиваем недостающие поля после обновлений
        for (const k of Object.keys(DEF)) if (s[k] === undefined) s[k] = deep(DEF[k]);
        for (const k of Object.keys(DEF.nai)) if (s.nai[k] === undefined) s.nai[k] = DEF.nai[k];
        for (const k of Object.keys(DEF.ns)) if (s.ns[k] === undefined) s.ns[k] = DEF.ns[k];
        for (const k of Object.keys(DEF.proxy)) if (s.proxy[k] === undefined) s.proxy[k] = DEF.proxy[k];
        if (!s.api || !Array.isArray(s.api.list)) s.api = { list: [] };
        return s;
    }
    function save() {
        try { const c = ctx(); if (typeof c.saveSettingsDebounced === 'function') { c.saveSettingsDebounced(); return; } } catch (e) { }
        try { if (typeof window.saveSettingsDebounced === 'function') { window.saveSettingsDebounced(); return; } } catch (e) { }
        try { const c = ctx(); if (typeof c.saveSettings === 'function') { c.saveSettings(); return; } } catch (e) { }
        try { localStorage.setItem('shk2_fallback', JSON.stringify(ctx().extensionSettings[KEY] || {})); } catch (e) { }
    }

    let LIB = null;
    function lib() {
        if (LIB) return LIB;
        const s = S();
        if (!s.library || !Array.isArray(s.library.styles)) {
            s.library = deep(DEF_LIB);
        }
        const lb = s.library;
        // встроенные шаблоны: подставляем тексты из TPL, если пустые
        const map = { p_scene: 'scene', p_comic: 'comic', p_marvel: 'marvel', p_chibi: 'chibi', p_v4: 'v4' };
        lb.prompts.forEach((p) => { if (map[p.id] && !l(p.text).trim()) p.text = TPL[map[p.id]] || ''; });
        for (const d of DEF_LIB.styles) if (!lb.styles.some((x) => x.id === d.id)) lb.styles.push(deep(d));
        for (const d of DEF_LIB.negs) if (!lb.negs.some((x) => x.id === d.id)) lb.negs.push(deep(d));
        for (const d of DEF_LIB.prompts) if (!lb.prompts.some((x) => x.id === d.id)) lb.prompts.push(deep(d));
        LIB = lb;
        return lb;
    }
    const libFind = (arr, id) => (arr || []).filter((x) => x.id === id)[0] || null;
    function saveLib() { LIB = null; save(); }

    // семейство модели: v5 | v4
    const provFamily = (s) => (s.provider === 'naistera' && !/^novelai-v5/i.test(s.ns.model) ? 'v4' : 'v5');
    const FAM = { v5: { tpl: 'promptId', style: 'styleId', neg: 'negId' }, v4: { tpl: 'promptIdV4', style: 'styleIdV4', neg: 'negIdV4' } };
    const DEF_TPL = { v5: 'p_scene', v4: 'p_v4' };
    const KINDS = ['scene', 'comic', 'v4', 'custom'];
    const kindOk = (kind, fam) => kind === 'custom' || (kind === 'v4' ? 'v4' : 'v5') === fam;
    function activePrompt(s) {
        const fam = provFamily(s || S());
        const id = (s || S())[FAM[fam].tpl];
        const lb = lib();
        let p = libFind(lb.prompts, id);
        if (!p || !kindOk(p.kind, fam)) p = libFind(lb.prompts, DEF_TPL[fam]);
        if (!p || !kindOk(p.kind, fam)) p = (lb.prompts || []).filter((q) => kindOk(q.kind, fam))[0] || null;
        return p;
    }
    function activeStyle(s) {
        s = s || S(); const fam = provFamily(s);
        const st = libFind(lib().styles, s[FAM[fam].style]);
        return st && (st.fam === 'v5' || st.fam === 'v4') && (st.fam === fam) ? st : null;
    }
    function activeNeg(s) {
        s = s || S(); const fam = provFamily(s);
        const ng = libFind(lib().negs, s[FAM[fam].neg]);
        return ng && (ng.fam === 'v5' || ng.fam === 'v4') && (ng.fam === fam) ? ng : null;
    }

    // ---------------------------------------------------------------- метаданные чата: внешности и сцены
    function meta() {
        const m = ctx().chatMetadata;
        if (!m.shark) m.shark = { looks: {}, npcs: [], scenes: {} };
        if (!m.shark.looks) m.shark.looks = {};
        if (!Array.isArray(m.shark.npcs)) m.shark.npcs = [];
        if (!m.shark.scenes) m.shark.scenes = {};
        return m.shark;
    }
    function saveMeta() { try { const c = ctx(); if (typeof c.saveChat === 'function') c.saveChat(); } catch (e) { } }
    const lookKey = (kind, name) => 'look_' + kind + '_' + h36(l(name).toLowerCase());
    function cleanLook(o) {
        o = jparse(o) || {};
        return {
            g: ['girl', 'boy', 'other'].indexOf(o.g) >= 0 ? o.g : '',
            app: l(o.app).trim(),
            cloth: l(o.cloth).trim(),
            alias: l(o.alias).trim(),
            neg: l(o.neg).trim(),
            ...(o.auto && o.app ? { auto: 1 } : {}),
        };
    }
    // персонажи чата (+персона пользователя)
    function chatChars() {
        const cc = ctx();
        const list = [];
        try {
            const ids = (cc.characters && cc.characters.length) ? cc.characters.map((_, i) => i) : [];
            const seen = {};
            for (const ch of cc.chat) {
                if (ch.is_user || ch.is_system) continue;
                const nm = l(ch.name).trim();
                if (!nm || seen[nm]) continue;
                seen[nm] = 1;
                list.push({ name: nm, kind: 'c' });
            }
        } catch (e) { }
        return list;
    }
    function personaName() { const cc = ctx(); return l(cc.name1).trim() || 'User'; }
    // список луков: персонажи + персона + NPC
    function collectLooks() {
        const m = meta();
        const out = [];
        for (const ch of chatChars()) {
            const k = lookKey('c', ch.name);
            const lk = cleanLook(m.looks[k]);
            out.push({ ...lk, name: ch.name, kind: 'c', id: ch.name, key: k });
        }
        const pn = personaName();
        if (pn) {
            const k = lookKey('u', pn);
            const lk = cleanLook(m.looks[k]);
            out.push({ ...lk, name: pn, kind: 'u', id: pn, key: k });
        }
        for (const n of m.npcs) {
            const e = cleanLook(n);
            if (!e.name) continue;
            out.push({ ...e, kind: 'n', id: l(n.id) || uid(), key: 'npc_' + l(n.id) });
        }
        return out;
    }
    function saveLook(lk) {
        const m = meta();
        if (lk.kind === 'n') {
            const arr = m.npcs;
            const i = arr.findIndex((x) => l(x.id) === l(lk.id));
            const rec = { id: lk.id, name: lk.name, g: lk.g, app: lk.app, cloth: lk.cloth, alias: lk.alias, neg: lk.neg };
            if (rec.app) rec.auto = lk.auto ? 1 : undefined;
            if (i >= 0) arr[i] = rec; else arr.push(rec);
        } else {
            m.looks[lk.key] = cleanLook(lk);
        }
        saveMeta();
    }

    // ---------------------------------------------------------------- маркер сцены
    const MARKER_RX = /\[(?:[A-ZА-ЯЁ]{2,24}_)?SCENE:\s*([^\]]*?)\s*\]/;
    const MARKER_G = /\[(?:[A-ZА-ЯЁ]{2,24}_)?SCENE:\s*([^\]]*?)\s*\]/g;
    const ANCHOR_G = /<!--scene:([a-z0-9]{4,40})-->/g;
    const anchor = (id) => '<!--scene:' + id + '-->';
    const RATIOS = ['1:1', '2:3', '3:2', '9:16', '16:9'];
    function parseMarker(inner) {
        let t = l(inner).replace(/\r/g, '').trim(), ratio = '', desc = t;
        const m = t.match(/^(\d{1,2}:\d{1,2})\s*\|\s*([\s\S]*)/);
        if (m) { ratio = m[1]; desc = m[2]; }
        if (RATIOS.indexOf(ratio) < 0) ratio = '3:2';
        desc = l(desc).replace(/\s*\n\s*/g, ' ').trim();
        if (desc.length > 4000) desc = desc.slice(0, 4000);
        return { ratio, desc };
    }
    const hasCyr = (s) => !/^[A-Z0-9_\s|:,.-]*$/.test(l(s));
    // найти ПОСЛЕДНИЙ валидный маркер в тексте
    function findMarker(text) {
        let m = null, r = null;
        MARKER_G.lastIndex = 0;
        while ((r = MARKER_G.exec(l(text)))) {
            const p = parseMarker(r[1]);
            if (p.desc && hasCyr(p.desc)) { p.raw = r[0]; m = p; }
        }
        MARKER_G.lastIndex = 0;
        return m;
    }
    function findAnchor(text) { let m = null, r; ANCHOR_G.lastIndex = 0; while ((r = ANCHOR_G.exec(l(text)))) m = r[1]; ANCHOR_G.lastIndex = 0; return m; }
    // «очистить» сообщение для LLM/контекста: убрать маркеры и якоря, теги → пробелы
    function plainify(s) {
        return l(s).replace(/<!--scene:[a-z0-9]{4,40}-->/g, '').replace(MARKER_G, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    }

    // ---------------------------------------------------------------- мэтчинг слов (имена, алиасы)
    const CYR2LAT = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya' };
    function translit(s) { return l(s).toLowerCase().split('').map((ch) => (Object.prototype.hasOwnProperty.call(CYR2LAT, ch) ? CYR2LAT[ch] : ch)).join(''); }
    // список слов из имени и алиасов (оригинал + транслит)
    function wordKeys(name, alias) {
        const out = [];
        [l(name)].concat(l(alias).split(/[,;\n]/)).forEach((raw) => {
            let e = raw.toLowerCase().trim();
            if (!e) return;
            [e, translit(e)].forEach((v) => {
                v.split(/[^0-9a-zа-яё]+/i).forEach((p) => { if (p.length >= 2 && out.indexOf(p) < 0) out.push(p); });
            });
        });
        return out;
    }
    const mentions = (text, keys) => { if (!keys.length) return false; const n = ' ' + l(text).toLowerCase().replace(/[^0-9a-zа-яё]+/gi, ' ') + ' '; return keys.some((k) => n.indexOf(' ' + k + ' ') !== -1); };
    // угадать пол по тегам внешности
    function genderFrom(app) {
        const e = ' ' + l(app).toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
        const f = / (1girl|girl|woman|female|lady) /.test(e), m = / (1boy|boy|man|male|guy) /.test(e);
        return f && !m ? 'girl' : m && !f ? 'boy' : '';
    }
    const LABEL_RX = /^\s*@([^,|]{1,60}?)\s*,\s*/;
    const lookTags = (lk) => [lk.app, lk.cloth].map((v) => w(l(v).replace(/[\[\]|]/g, ' '))).filter(Boolean).join(', ');

    // вычистить из текста блока конфликтующие теги внешности (длина/цвет волос, глаза, кожа),
    // если лук уже задаёт их: модель не должна «перекрашивать» персонажа
    const HAIR_COL = '(?:light |dark |pale |deep |bright )?(?:black|blonde|blond|brown|red|white|silver|grey|gray|pink|blue|green|purple|violet|orange|aqua|yellow|golden|gold|teal|cyan|lavender|platinum blonde|ash blonde|strawberry blonde|platinum|ginger|auburn|chestnut|beige|magenta|crimson|scarlet|amber|hazel|maroon|navy|turquoise|emerald|indigo|multicolored|two-tone|gradient|streaked|rainbow)';
    const HAIR_RX = new RegExp('^(?:(very short|short|medium|long|very long|absurdly long|shoulder-length|waist-length)\\s+)?(?:(' + HAIR_COL + '|dark|light)\\s+)?hair$');
    const EYES_RX = new RegExp('^(' + HAIR_COL + ')\\s+eyes$');
    const SKIN_RX = /^(dark|pale|tan|tanned|fair|light|olive|brown|white|black|grey|gray|blue|green|red|purple)[- ](?:skin|skinned(?: female| male)?)$/;
    const normLookCol = (s) => l(s).replace(/\bblond\b/, 'blonde').replace(/gray/g, 'grey').replace(/\bgolden\b/, 'gold');
    const normSkin = (s) => s.replace('tanned', 'tan').replace('gray', 'grey');
    const FLEX_COL = /^(multicolored|two-tone|gradient|streaked|rainbow)$/;
    function stripConflicts(text, app) {
        const have = { len: {}, col: {}, eye: {}, skin: {} };
        l(app).split(',').forEach((t) => {
            let m; const n = normTag(t);
            if ((m = HAIR_RX.exec(n))) { if (m[1]) have.len[m[1]] = 1; if (m[2] && !FLEX_COL.test(m[2])) have.col[normLookCol(m[2])] = 1; }
            else if ((m = EYES_RX.exec(n))) have.eye[normLookCol(m[1])] = 1;
            else if ((m = SKIN_RX.exec(n))) have.skin[normSkin(m[1])] = 1;
        });
        const any = (o) => Object.keys(o).length > 0;
        if (!any(have.len) && !any(have.col) && !any(have.eye) && !any(have.skin)) return text;
        return w(l(text).split(',').filter((t) => {
            const n = normTag(t);
            let m;
            if ((m = HAIR_RX.exec(n))) return !(m[1] && any(have.len) && !have.len[m[1]] || m[2] && !FLEX_COL.test(m[2]) && any(have.col) && !have.col[normLookCol(m[2])]);
            if ((m = EYES_RX.exec(n))) return !(any(have.eye) && !have.eye[normLookCol(m[1])]);
            if ((m = SKIN_RX.exec(n))) return !(any(have.skin) && !have.skin[normSkin(m[1])]);
            return true;
        }).join(','));
    }

    // ---------------------------------------------------------------- композиция сцены
    // desc — текст маркера; looks — список луков. Возвращает {base, chars, negs, hit, match, guard, gneg}
    function compose(desc, looks) {
        const texts = [];
        const parts = l(desc).split('|').map((p) => { const e = E(p); if (e.text) texts.push(e.text); return e.tags.trim(); }).filter(Boolean);
        const out = { base: w(parts[0] || ''), chars: [], negs: [], hit: {}, match: [] };
        const blocks = parts.slice(1).map((t) => {
            const m = LABEL_RX.exec(t);
            let lab = '';
            if (m) { lab = m[1].trim(); t = t.slice(m[0].length); }
            return { t: w(t), lab, who: -1 };
        });
        const L = (looks || []).map((lk, i) => ({ i, l: lk, w: wordKeys(lk.name, lk.alias), g: lk.g || genderFrom(lk.app), tags: lookTags(lk), at: -1 }));
        const taken = {};
        const s = (lk, bi, sure) => { lk.at = bi; blocks[bi].who = lk.i; blocks[bi].sure = !!sure; taken[bi] = 1; };
        // 1) точное совпадение по метке @Name
        blocks.forEach((b, bi) => {
            if (!b.lab || /^other$/i.test(b.lab)) return;
            const ws = wordKeys(b.lab, '');
            for (const lk of L) { if (lk.at < 0 && ws.some((x) => lk.w.indexOf(x) >= 0)) { s(lk, bi, true); break; } }
        });
        // 2) по упоминанию имени в блоке (2 прохода)
        for (let pass = 0; pass < 2; pass++) {
            for (const lk of L) {
                if (lk.at >= 0) continue;
                for (let bi = 0; bi < blocks.length; bi++) {
                    if (taken[bi] || /^other$/i.test(blocks[bi].lab)) continue;
                    if (mentions(blocks[bi].t, lk.w)) {
                        const others = L.filter((o) => o !== lk && mentions(blocks[bi].t, o.w)).length;
                        if (pass !== 0 || !others) { s(lk, bi, !others); break; }
                    }
                }
            }
        }
        // 3) одиночный девушка/парень без метки
        ['girl', 'boy'].forEach((g) => {
            const un = L.filter((v) => v.at < 0 && v.g === g);
            const cands = [];
            blocks.forEach((b, bi) => { if (!taken[bi] && !b.lab && genderFrom(b.t) === g) cands.push(bi); });
            if (un.length === 1 && cands.length === 1) s(un[0], cands[0]);
        });
        // 4) главный персонаж → единственный блок без метки
        const unlabeled = [];
        blocks.forEach((b, bi) => { if (!taken[bi] && !b.lab) unlabeled.push(bi); });
        const firstChar = L.filter((v) => v.l.kind === 'c')[0];
        if (firstChar && firstChar.at < 0 && unlabeled.length === 1 && (blocks.length === 1 || L.some((v) => v.at >= 0))) s(firstChar, unlabeled[0]);
        // 5) собрать блоки
        blocks.forEach((b) => {
            const lk = b.who >= 0 ? L[b.who] : null;
            if (lk && b.sure) out.match.push({ i: lk.i, t: b.t });
            const r = lk && lk.l.app ? stripConflicts(b.t, lk.l.app) : b.t;
            out.chars.push(lk && lk.tags ? xmerge(r, lk.tags) : r);
            out.negs.push(lk ? w(lk.l.neg) : '');
            if (lk && lk.tags) out.hit[lk.l.key] = 1;
        });
        // 6) неиспользованные луки — впрыснуть в базу
        if (blocks.length) {
            L.forEach((lk) => { if (lk.at < 0 && lk.tags && mentions(out.base, lk.w)) { out.base = xmerge(out.base, lk.tags); out.hit[lk.l.key] = 1; } });
        } else {
            const p = L.filter((lk) => lk.tags && mentions(out.base, lk.w));
            if (p.length >= 2) {
                p.forEach((lk) => { out.chars.push(lk.tags); out.negs.push(w(lk.l.neg)); out.hit[lk.l.key] = 1; });
            } else if (p.length === 1) {
                out.base = xmerge(stripConflicts(out.base, p[0].l.app), p[0].tags);
                out.hit[p[0].l.key] = 1;
            } else if (firstChar && firstChar.tags && /(^|[^a-z])(\d+(girl|boy|other)s?|girls?|boys?|wom[ae]n|m[ae]n|male|female|person|people|couple|solo|duo|portrait)([^a-z]|$)/i.test(l(out.base))) {
                out.base = xmerge(stripConflicts(out.base, firstChar.l.app), firstChar.tags);
                out.hit[firstChar.l.key] = 1;
            }
        }
        out.base = O(out.base, texts.join(' '));
        return out;
    }

    // ---------------------------------------------------------------- гарды (фильтры NovelAI)
    const NSFW_RX = /^(nsfw|explicit|uncensored|nude|naked|completely nude|topless|bottomless|sex|sex from behind|vaginal|anal|oral|fellatio|cunnilingus|penis|pussy|vagina|nipples|areolae|cum|cum in pussy|x-ray|cross-section|after sex|spread legs|missionary|cowgirl position|doggystyle|reverse cowgirl position|straddling|groping|breast grab|masturbation|handjob|paizuri|pubic hair|erection|ejaculation|orgasm|penetration|imminent penetration|clothed sex|nude cover)$/;
    const AGE_RX = /^(loli|shota|child|children|kid|kids|toddler|baby|infant|little girl|little boy|young girl|young boy|kindergarten|elementary school|elementary schooler|elementary school student|aged down|preschooler)$/;
    const stripRx = (s, rx) => { const e = E(s); return O(w(e.tags.split(',').filter((t) => !rx.test(normTag(t).replace(/^(source|target|mutual)#/, ''))).join(', ')), e.text); };
    const qTags = (model, q) => {
        if (!q || q === 'none') return '';
        if (model.indexOf('nai-diffusion-5-') === 0) return q === 'light' ? 'very aesthetic, amazing quality, no text' : 'very aesthetic, masterpiece, no text';
        if (model === 'nai-diffusion-4-5-curated') return 'location, masterpiece, no text, -0.8::feet::, rating:general';
        return 'location, very aesthetic, masterpiece, no text';
    };
    // quality tags к базе; если на картинке текст — убрать "no text"
    const addQuality = (s, qt) => { if (!qt) return s; const e = E(s); if (hasText(s)) qt = qt.split(',').map((t) => t.trim()).filter((t) => t && t.toLowerCase() !== 'no text').join(', '); return O(xmerge(e.tags, qt), e.text); };
    function applyGuards(comp, styleTags) {
        const all = [E(comp.base).tags].concat(comp.chars, [l(styleTags)]).join(',').split(',').map((t) => normTag(t).replace(/^(source|target|mutual)#/, ''));
        const chibi = all.indexOf('chibi') >= 0;
        const nsfw = all.some((t) => NSFW_RX.test(t));
        if (chibi && nsfw) {
            comp.base = stripRx(comp.base, NSFW_RX);
            comp.chars = comp.chars.map((t) => stripRx(t, NSFW_RX));
            comp.gneg = 'nsfw, nude, explicit';
            comp.guard = NSFW_RX;
        } else if (nsfw) {
            comp.base = stripRx(comp.base, AGE_RX);
            comp.chars = comp.chars.map((t) => stripRx(t, AGE_RX));
            comp.gneg = 'loli, shota, child';
            comp.guard = AGE_RX;
        }
        if (comp.guard) { styleTags = stripRx(styleTags, comp.guard); }
        return styleTags;
    }

    // ---------------------------------------------------------------- NovelAI параметры
    const SIZES = {
        small: { '1:1': [640, 640], '2:3': [512, 768], '3:2': [768, 512], '9:16': [448, 832], '16:9': [832, 448] },
        normal: { '1:1': [1024, 1024], '2:3': [832, 1216], '3:2': [1216, 832], '9:16': [768, 1344], '16:9': [1344, 768] },
        big: { '1:1': [1472, 1472], '2:3': [1024, 1536], '3:2': [1536, 1024], '9:16': [1088, 1920], '16:9': [1920, 1088] },
    };
    const sizeOf = (nai, ratio) => { const t = SIZES[nai.size] || SIZES.normal; return t[ratio] || t['3:2']; };
    const isV5 = (m) => l(m).indexOf('nai-diffusion-5-') === 0;
    const isMedium = (m) => m === 'nai-diffusion-5-full-medium';
    const UC_BASE = 'lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page';
    function ucPreset(model, uc) {
        if (isMedium(model)) return UC_BASE;
        const curated = model === 'nai-diffusion-4-5-curated';
        const heavy = curated ? 'blurry, lowres, upscaled, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, negative space, blank page' : UC_BASE;
        if (uc === 'heavy') return heavy;
        if (uc === 'light') return isV5(model) ? 'lowres, bad hands, bad anatomy, artistic error, sepia, white haze, worst quality, very displeasing, jpeg artifacts, 0::ai-generated::' : curated ? 'blurry, lowres, upscaled, artistic error, scan artifacts, jpeg artifacts, logo, too many watermarks, negative space, blank page' : 'lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, multiple views, very displeasing, too many watermarks, negative space, blank page';
        if (uc === 'human') return curated ? 'blurry, lowres, upscaled, artistic error, film grain, scan artifacts, bad anatomy, bad hands, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, @_@, mismatched pupils, glowing eyes, negative space, blank page' : heavy + ', @_@, mismatched pupils, glowing eyes, bad anatomy';
        return '';
    }

    // ---------------------------------------------------------------- сеть
    function fetchT(url, opts, ms) {
        const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = setTimeout(() => { try { ctl && ctl.abort(); } catch (e) { } }, ms || 180000);
        opts = opts || {};
        if (ctl) opts.signal = ctl.signal;
        return fetch(url, opts).then((r) => { clearTimeout(timer); return r; }, (e) => {
            clearTimeout(timer);
            if (e && e.name === 'AbortError') throw mkErr('timeout', 'Превышено время ожидания (таймаут запроса)');
            throw mkErr('network', 'Сетевой сбой: ' + (e && e.message ? e.message : 'нет соединения'));
        });
    }
    // NovelAI отдаёт ZIP (или чистый PNG): достаём PNG
    function unpackZip(buf) {
        const t = new Uint8Array(buf);
        if (t[0] === 137 && t[1] === 80 && t[2] === 78 && t[3] === 71) return Promise.resolve(new Blob([t], { type: 'image/png' }));
        if (!(t[0] === 80 && t[1] === 75 && t[2] === 3 && t[3] === 4)) return Promise.reject(mkErr('badimg', 'Сервер вернул не картинку (не PNG/ZIP)'));
        const dv = new DataView(t.buffer, t.byteOffset);
        const method = dv.getUint16(8, true);
        const flags = dv.getUint16(6, true);
        const csize = dv.getUint32(18, true);
        const start = 30 + dv.getUint16(26, true) + dv.getUint16(28, true);
        let end = -1;
        if (!(flags & 8) && csize > 0) end = start + csize;
        else {
            for (let i = t.length - 22; i >= 0; i--) {
                if (t[i] === 80 && t[i + 1] === 75 && t[i + 2] === 5 && t[i + 3] === 6) { end = dv.getUint32(i + 16, true); break; }
            }
            if (end < 0) return Promise.reject(mkErr('badimg', 'Не удалось прочитать ZIP от NovelAI'));
            end = (t[end - 16] === 80 && t[end - 15] === 75 && t[end - 14] === 7 && t[end - 13] === 8) ? end - 16 : end - 12;
        }
        const chunk = t.subarray(start, end);
        if (method === 0) return Promise.resolve(new Blob([chunk], { type: 'image/png' }));
        if (typeof DecompressionStream === 'undefined') return Promise.reject(mkErr('badimg', 'Браузер не умеет распаковывать ZIP (DecompressionStream)'));
        const ds = new DecompressionStream('deflate-raw');
        const wr = ds.writable.getWriter();
        wr.write(chunk); wr.close();
        return new Response(ds.readable).arrayBuffer().then((b) => new Blob([b], { type: 'image/png' }));
    }
    function blobToData(blob) {
        if (typeof FileReader !== 'undefined') return new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = () => rej(mkErr('badimg', 'Не удалось прочитать картинку'));
            r.readAsDataURL(blob);
        });
        return blob.arrayBuffer().then((b) => {
            const u = new Uint8Array(b); let s = '';
            for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
            return 'data:' + (blob.type || 'image/png') + ';base64,' + btoa(s);
        });
    }
    function httpErr(res, text, extra) {
        const code = res.status;
        let msg = 'HTTP ' + code;
        if (code === 401 || code === 403) msg = 'Неверный или просроченный токен (401/403)';
        else if (code === 402) msg = 'Закончились Anlas / нет подписки (402)';
        else if (code === 429) msg = 'Сервер перегружен (429), попробуй позже';
        else if (code >= 500) msg = 'Сбой сервера (' + code + ')';
        else msg = 'HTTP ' + code + ': ' + l(text).slice(0, 160);
        const e = mkErr('http', (extra ? extra + ' — ' : '') + msg);
        e.status = code;
        return e;
    }

    // ---------------------------------------------------------------- NovelAI generate
    function naiGenerate(naiSet, token, comp, negUser, seed, ratio, stage) {
        if (!token) return Promise.reject(mkErr('cfg', 'Не задан токен NovelAI (вкладка «API»)'));
        const model = naiSet.model, v5 = isV5(model), medium = isMedium(model);
        const [W, H] = sizeOf(naiSet, ratio);
        let chars = comp.chars.slice(), cneg = comp.negs.slice(), base = comp.base;
        const cap = v5 ? 22 : 6;
        if (chars.length > cap) { base = I(base, chars.slice(cap).join(', ')); chars = chars.slice(0, cap); cneg = cneg.slice(0, cap); }
        base = addQuality(base, qTags(model, naiSet.quality));
        const neg = negFilter(medium ? xmerge(UC_BASE, comp.gneg || '') : [ucPreset(model, naiSet.uc), w(negUser)].filter(Boolean).join(', '), base, chars);
        while (cneg.length < chars.length) cneg.push('');
        const cap4 = (t, arr) => ({ base_caption: t, char_captions: arr.map((ch) => ({ char_caption: ch, centers: [{ x: 0.5, y: 0.5 }] })) });
        const params = {
            params_version: 4,
            width: W, height: H,
            scale: naiSet.scale,
            sampler: medium ? 'k_euler_ancestral' : naiSet.sampler,
            steps: medium ? 14 : naiSet.steps,
            n_samples: 1,
            seed: seed,
            ucPreset: medium ? 0 : 3,
            qualityToggle: false,
            cfg_rescale: 0,
            noise_schedule: naiSet.noise,
            negative_prompt: neg,
            deliberate_euler_ancestral_bug: false,
            prefer_brownian: true,
            v4_prompt: { caption: cap4(base, chars), use_coords: false, use_order: true, legacy_uc: false },
            v4_negative_prompt: { caption: cap4(neg, medium ? chars.map(() => '') : cneg), use_coords: false, use_order: false, legacy_uc: false },
        };
        if (medium) delete params.cfg_rescale;
        const req = { input: base, model: model, action: 'generate', parameters: params };
        let retried429 = 0, retried400 = false;
        const go = () => fetchT('https://image.novelai.net/ai/generate-image', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(req),
        }, 180000).then((res) => {
            if (res.ok) return res.arrayBuffer().then(unpackZip);
            return res.text().then((txt) => {
                if (res.status === 429 && retried429 < 1) { retried429++; if (stage) stage('Сервер занят (429), жду 8 сек…'); return sleep(8000).then(go); }
                if (res.status === 400 && !retried400 && /token|length|long|prompt/i.test(txt)) {
                    retried400 = true;
                    const e = E(req.input);
                    req.input = O(cut(e.tags, Math.max(300, (isV5(model) ? 2400 : 900) - e.text.length)), e.text);
                    req.parameters.v4_prompt.caption.base_caption = req.input;
                    return go();
                }
                throw httpErr(res, txt, 'NovelAI');
            });
        });
        if (stage) stage('Рисую в NovelAI…');
        return go().then(blobToData).then((data) => ({ data, w: W, h: H, req: { base, chars, neg } }));
    }

    // ---------------------------------------------------------------- naiproxy
    function proxyGenerate(set, token, comp, negUser, seed, ratio, styleTags, stage) {
        if (!isHttps(set.proxy.url)) return Promise.reject(mkErr('cfg', 'Укажи HTTPS-адрес прокси (вкладка «API»)'));
        const model = set.nai.model;
        const [W, H] = sizeOf(set.nai, ratio);
        const body = {
            prompt: comp.base, ratio: ratio, seed: seed, model: model,
            sampler: isMedium(model) ? 'k_euler_ancestral' : set.nai.sampler,
            noise: set.nai.noise,
            steps: isMedium(model) ? 14 : set.nai.steps,
            scale: set.nai.scale,
            width: W, height: H,
        };
        if (set.proxy.sendTok && token) body.token = token;
        if (negUser) body.negative = negUser;
        if (stage) stage('Рисую через прокси…');
        return fetchT(set.proxy.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body) }, 300000)
            .then((res) => {
                if (!res.ok) return res.text().then((t) => { throw httpErr(res, t, 'Прокси'); });
                const ct = res.headers.get('content-type') || '';
                if (/json/i.test(ct)) {
                    return res.json().then((j) => {
                        const img = extractImg(j);
                        if (!img) throw mkErr('badimg', 'Прокси вернул JSON без картинки');
                        return img;
                    });
                }
                return res.arrayBuffer().then((b) => {
                    const u = new Uint8Array(b);
                    if (u[0] === 137 && u[1] === 80) return Promise.resolve('data:image/png;base64,' + base64(u));
                    try { const j = JSON.parse(new TextDecoder().decode(u)); const img = extractImg(j); if (img) return Promise.resolve(img); } catch (e) { }
                    return unpackZip(b).then(blobToData);
                });
            })
            .then((data) => ({ data, w: W, h: H, req: { base: comp.base, chars: comp.chars, neg: negUser } }));
    }
    function base64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); }
    function extractImg(j) {
        const cands = [];
        const push = (v) => { if (!v) return; if (typeof v === 'string') cands.push(v); else if (typeof v === 'object') cands.push(v.data_url, v.url, v.image, v.b64_json, v.b64, v.base64); };
        if (!j || typeof j !== 'object') return null;
        push(j.data_url); push(j.image); push(j.url);
        if (j.images && j.images[0]) push(j.images[0]);
        if (j.data && j.data[0]) push(j.data[0]);
        push(j.result); push(j.output);
        for (const v of cands) {
            const s = l(v).trim();
            if (!s) continue;
            if (/^data:image\//i.test(s)) return s;
            if (/^https?:\/\//i.test(s)) return s.replace(/^http:/i, 'https:');
            if (s.length > 200 && /^[A-Za-z0-9+\/=\s]+$/.test(s)) {
                const clean = s.replace(/\s+/g, '');
                const mime = clean.indexOf('/9j/') === 0 ? 'image/jpeg' : clean.indexOf('UklGR') === 0 ? 'image/webp' : 'image/png';
                return 'data:' + mime + ';base64,' + clean;
            }
        }
        return null;
    }

    // ---------------------------------------------------------------- Naistera
    const NS_BASE = 'https://naistera.org';
    const NS_UC = 'lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, too many watermarks, negative space, blank page';
    function nsGenerate(set, token, comp, negUser, seed, ratio, styleTags, stage) {
        if (!token) return Promise.reject(mkErr('cfg', 'Не задан токен Naistera (вкладка «API»)'));
        const model = set.ns.model;
        const cap = /^novelai-v5/i.test(model) ? 22 : 6;
        let chars = comp.chars.slice(), f = comp.base;
        if (styleTags) f = /[.\]]$/.test(styleTags) ? styleTags + ' ' + f : w(styleTags + ', ' + f);
        if (chars.length > cap) { f = I(f, chars.slice(cap).join(', ')); chars = chars.slice(0, cap); }
        f = addQuality(f, set.ns.quality === 'none' ? '' : (/^novelai-v5/i.test(model) ? 'very aesthetic, masterpiece, no text' : 'location, very aesthetic, masterpiece, no text'));
        const fe = E(f);
        const m = cut(fe.tags, Math.max(400, 2600 - fe.text.length - chars.join(' | ').length));
        const body = { prompt: [O(m, fe.text)].concat(chars).join(' | '), aspect_ratio: ratio, model: model };
        const catEntry = (set.ns.cat || []).filter((x) => x && x.id === model)[0];
        const useNeg = catEntry ? catEntry.neg !== false : !/medium/i.test(model);
        if (useNeg) { const neg = negFilter([NS_UC, negUser].filter(Boolean).join(', '), f, chars); if (neg) body.negative_prompt = neg; }
        if (stage) stage('Отправляю в Naistera…');
        const toData = (j) => {
            const img = extractImg(j);
            if (!img) throw mkErr('badimg', 'Naistera вернула ответ без картинки');
            if (img.indexOf('data:') === 0) return Promise.resolve(img);
            return fetchT(img, {}, 120000).then((r) => { if (!r.ok) throw mkErr('http', 'Не удалось скачать картинку от Naistera'); return r.blob(); }).then(blobToData);
        };
        let started = now(), lastTick = 0;
        const poll = (jobId) => sleep(3000).then(() => {
            if (now() - started > 600000) throw mkErr('timeout', 'Naistera не ответила за 10 минут');
            if (now() - lastTick > 30000) { lastTick = now(); if (stage) stage('Жду картинку от Naistera…'); }
            return fetchT(NS_BASE + '/api/generate/jobs/' + encodeURIComponent(jobId), { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } }, 30000).then((res) => res.text().then((txt) => {
                if (!res.ok) throw httpErr(res, txt, 'Naistera');
                const j = jparse(txt) || {};
                const st = l(j.status).toLowerCase();
                if (extractImg(j)) return toData(j);
                if (st === 'failed' || st === 'error' || j.error) {
                    const d = j.detail || (j.error && (j.error.message || j.error)) || j.message || '—';
                    throw mkErr('http', 'Naistera: генерация провалилась — ' + cut(l(typeof d === 'object' ? JSON.stringify(d) : d), 160));
                }
                return poll(jobId);
            }));
        });
        return fetchT(NS_BASE + '/api/generate', { method: 'POST', headers: { Authorization: 'Bearer ' + token, Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 300000)
            .then((res) => res.text().then((txt) => {
                if (!res.ok) throw httpErr(res, txt, 'Naistera');
                const j = jparse(txt) || {};
                if (extractImg(j)) return toData(j);
                if (j.job_id || j.id) return poll(l(j.job_id || j.id));
                throw mkErr('badimg', 'Naistera вернула непонятный ответ');
            }))
            .then((data) => {
                const dims = dataDims(data);
                return { data, w: dims ? dims[0] : 0, h: dims ? dims[1] : 0, req: { base: f, chars, neg: body.negative_prompt || '' } };
            });
    }
    // прочитать размеры из dataURL (первые ~87 КБ достаточно)
    function dataDims(dataUrl) {
        try {
            const m = /^data:[^,]*;base64,(.*)$/.exec(l(dataUrl));
            if (!m) return null;
            const bin = atob(m[1].slice(0, 87400));
            const at = (i) => bin.charCodeAt(i) & 255;
            if (at(0) === 137 && at(1) === 80) return [(at(16) << 24 | at(17) << 16 | at(18) << 8 | at(19)) >>> 0, (at(20) << 24 | at(21) << 16 | at(22) << 8 | at(23)) >>> 0];
            if (at(0) === 255 && at(1) === 216) {
                for (let o = 2; o + 9 < bin.length;) {
                    if (at(o) === 255) {
                        const marker = at(o + 1);
                        const len = at(o + 2) << 8 | at(o + 3);
                        if (marker >= 192 && marker <= 195) return [at(o + 7) << 8 | at(o + 8), at(o + 5) << 8 | at(o + 6)];
                        o += 2 + len;
                    } else o++;
                }
            }
        } catch (e) { }
        return null;
    }

    // ---------------------------------------------------------------- список CHARACTERS для LLM
    function charsList(looks) {
        if (!looks.length) return '';
        let anyEmpty = false;
        const lines = looks.map((lk) => {
            const t = lookTags(lk);
            if (!t) anyEmpty = true;
            return '@' + lk.name + (lk.g ? ' (' + lk.g + ')' : '') + (lk.kind === 'u' ? ' — персона пользователя' : lk.kind === 'n' ? ' — NPC' : '') + ': ' + (t || 'внешность пока не сохранена');
        });
        return 'CHARACTERS (fixed looks: copy each listed appearance into that character block exactly, every time, even if the story does not repeat it; never change hair, eye or skin color' + (anyEmpty ? '. For anyone with no stored look yet, take hair color and length, hairstyle, eye color, skin tone and build from the character profile and keep them identical in every picture' : '') + '):\n' + lines.join('\n');
    }
    // предыдущая картинка (для комикс-шаблона — чтобы не повторять раскладку)
    function prevImageHint(kind) {
        if (kind !== 'comic') return '';
        const m = meta();
        const h = m.lastImg;
        if (!h || !h.h) return '';
        return 'PREVIOUS IMAGE in this chat: ' + (h.r ? h.r + ', ' : '') + l(h.h).replace(/[\[\]|<>]/g, ' ') + '. Pick another ratio or layout when another one fits this beat.';
    }
    function rememberLayout(ratio, comp) {
        try {
            const first = E(l(comp.base).split('|')[0]).tags.split(',').map((t) => cut(t.trim(), 40)).filter(Boolean).slice(0, 3).join(', ');
            if (first) { meta().lastImg = { r: RATIOS.indexOf(ratio) >= 0 ? ratio : '', h: first, at: now() }; saveMeta(); }
        } catch (e) { }
    }

    // ---------------------------------------------------------------- контекст: история + цель
    function storyContext(ctxN, targetMesId) {
        const cc = ctx();
        const chat = cc.chat || [];
        const personaNm = personaName();
        let target = null;
        if (targetMesId !== null && targetMesId !== undefined) target = chat[Number(targetMesId)] || null;
        if (!target && targetMesId !== null && targetMesId !== undefined) return { story: '', target: '', targetId: null };
        if (!target) { const arr = chat.filter((m) => !m.is_user && !m.is_system); target = arr[arr.length - 1] || null; }
        const idx = target ? chat.indexOf(target) : -1;
        const story = (idx >= 0 ? chat.slice(Math.max(0, idx - ival(ctxN, 4, 0, 20)), idx) : [])
            .filter((m) => !m.is_system)
            .map((m) => (m.is_user ? personaNm : l(m.name).trim() || 'Character') + ': ' + cut(plainify(m.mes), 1200))
            .join('\n\n');
        return { story, target: target ? cut(plainify(target.mes), 3500) : '', targetId: target ? chat.indexOf(target) : null };
    }
    // описания карточек персонажей (для референсов LLM)
    function cardTexts() {
        const cc = ctx();
        const parts = [];
        try {
            const seen = {};
            for (const m of cc.chat) {
                if (m.is_user || m.is_system) continue;
                const nm = l(m.name).trim();
                if (!nm || seen[nm]) continue;
                seen[nm] = 1;
                const ch = (cc.characters || []).filter((x) => x && l(x.name).trim() === nm)[0];
                if (ch && ch.description) parts.push('[' + nm + ']\n' + cut(plainify(ch.description), 1500));
            }
        } catch (e) { }
        try {
            const pd = personaDesc();
            if (pd) parts.push('[' + personaName() + ' — user persona]\n' + cut(plainify(pd), 900));
        } catch (e) { }
        return parts.join('\n\n');
    }
    function personaDesc() {
        const cc = ctx();
        try {
            const ps = cc.personas;
            const av = cc.userAvatar;
            if (ps && av && ps[av] !== undefined) {
                const v = ps[av];
                if (typeof v === 'string') return v;
                if (v && typeof v === 'object') return v.description || v.text || '';
            }
        } catch (e) { }
        return '';
    }

    // ---------------------------------------------------------------- LLM-запросы (писатель «api»)
    const PLATFORMS = [
        ['openai', 'OpenAI-compatible', 'https://api.openai.com/v1'],
        ['gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta'],
        ['anthropic', 'Anthropic Claude', 'https://api.anthropic.com/v1'],
    ];
    function findConn(id) { return (S().api.list || []).filter((x) => x.id === id)[0] || null; }
    function llmCall(conn, key, system, user, maxTokens) {
        if (!conn) return Promise.reject(mkErr('cfg', 'Не выбрано API-подключение (вкладка «API»)'));
        if (!key) return Promise.reject(mkErr('cfg', 'У подключения нет ключа'));
        const base = l(conn.base || (PLATFORMS.filter((p) => p[0] === conn.platform)[0] || [])[2]).replace(/\/+$/, '');
        if (!isHttps(base)) return Promise.reject(mkErr('cfg', 'Адрес подключения должен быть HTTPS'));
        if (!conn.model) return Promise.reject(mkErr('cfg', 'У подключения не задана модель'));
        maxTokens = maxTokens || 2000;
        let url, headers, body, extract;
        if (conn.platform === 'gemini') {
            url = base + '/models/' + encodeURIComponent(l(conn.model).replace(/^models\//, '')) + ':generateContent';
            headers = { 'Content-Type': 'application/json', 'x-goog-api-key': key };
            body = { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens } };
            extract = (j) => { const t = j && j.candidates && j.candidates[0]; return t && t.content && t.content.parts ? t.content.parts.map((p) => l(p.text)).join('') : ''; };
        } else if (conn.platform === 'anthropic') {
            url = base + '/messages';
            headers = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
            body = { model: conn.model, max_tokens: maxTokens, system: system, messages: [{ role: 'user', content: user }] };
            extract = (j) => (j && Array.isArray(j.content) ? j.content.filter((p) => p.type === 'text').map((p) => l(p.text)).join('') : '');
        } else {
            url = /\/chat\/completions$/.test(base) ? base : base + '/chat/completions';
            headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key };
            body = { model: conn.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.7, max_tokens: maxTokens };
            extract = (j) => { const ch = j && j.choices && j.choices[0]; let t = ch && (ch.message || ch.delta) ? ch.message ? ch.message.content : ch.delta.content : ''; if (Array.isArray(t)) t = t.map((p) => l(p.text)).join(''); return l(t); };
        }
        return fetchT(url, { method: 'POST', headers: headers, body: JSON.stringify(body) }, 120000).then((res) => res.text().then((txt) => {
            if (!res.ok) throw httpErr(res, txt, 'LLM');
            let j = null; try { j = JSON.parse(txt); } catch (e) { }
            const out = j ? extract(j) : '';
            if (!out.trim()) throw mkErr('http', 'LLM вернул пустой ответ');
            return out;
        }));
    }

    // писатель «api»: сам придумывает маркер по шаблону
    function apiWrite(targetMesId, stage) {
        const s = S();
        const tpl = activePrompt(s);
        if (!tpl || !l(tpl.text).trim()) return Promise.reject(mkErr('cfg', 'Шаблон промпта пустой (вкладка «Пресеты»)'));
        const conn = findConn(s.apiId);
        const looks = collectLooks();
        if (stage) stage('Пишу промпт (LLM)…');
        return Promise.resolve().then(() => {
            const ctxs = storyContext(s.ctxN, targetMesId);
            const cards = s.refs ? cardTexts() : '';
            const system = l(tpl.text).trim() + '\n\nENGINE LABELS: start every character block with "@Name," using the exact name from the CHARACTERS list, or "@other," for anyone else. The engine strips these labels before drawing.\nOutput ONLY the single marker line [SCENE: RATIO | PROMPT] and nothing else.';
            const userParts = [
                cards ? 'CHARACTER CARDS:\n' + cards : '',
                charsList(looks),
                ctxs.story ? 'STORY SO FAR (oldest first):\n' + ctxs.story : '',
                'REPLY TO ILLUSTRATE:\n' + (ctxs.target || '(empty)'),
                prevImageHint(tpl.kind),
                'Now output the single [SCENE: ...] marker line for this reply.',
            ].filter(Boolean).join('\n\n');
            return llmCall(conn, conn ? conn.key : '', system, userParts).then((txt) => {
                const mk = findMarker(txt);
                if (!mk) throw mkErr('nomarker', 'LLM не выдал маркер [SCENE: ...]. Ответ: ' + cut(l(txt).replace(/\s+/g, ' '), 200));
                return { ratio: mk.ratio, desc: mk.desc };
            });
        });
    }

    // инъекция инструкций в промпт Таверны (inline-писатель)
    function inlineInjection(data) {
        try {
            if (!data || !Array.isArray(data.prompt)) return;
            const s = S();
            if (s.mode === 'off' || s.writer !== 'inline' || data.dryRun) return;
            const chat = ctx().chat || [];
            if (!chat.length || !chat[chat.length - 1].is_user) return; // только при ответе персонажа
            const tpl = activePrompt(s);
            if (!tpl || !l(tpl.text).trim()) return;
            const looks = collectLooks();
            const parts = ['<scene_image_instructions>', l(tpl.text).trim()];
            if (s.refs && looks.length) {
                parts.push('ENGINE LABELS: start every character block with "@Name," using the exact name from the CHARACTERS list, or "@other," for anyone else. The engine strips these labels before drawing. If an appearance is listed, use those tags for that character.');
                parts.push(charsList(looks));
            }
            parts.push('HTML comments like <!--scene:...--> in the chat history are technical anchors of an image plugin: ignore them and never write them yourself.');
            parts.push('</scene_image_instructions>');
            data.prompt.push({ role: 'system', content: parts.join('\n\n') });
        } catch (e) { console.warn('[sharkimage] inline injection', e); }
    }

    // ---------------------------------------------------------------- сохранение картинки в Таверну
    const splitData = (d) => { const m = /^data:([^;]+);base64,(.*)$/s.exec(d || ''); return m ? { mime: m[1], b64: m[2].replace(/\s+/g, '') } : null; };
    async function uploadImage(dataUrl, name) {
        const x = splitData(dataUrl);
        if (!x) throw mkErr('badimg', 'Пустая картинка');
        const fmt = (x.mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
        const r = await fetch('/api/images/upload', { method: 'POST', headers: ctx().getRequestHeaders(), body: JSON.stringify({ image: x.b64, format: fmt, ch_name: 'sharkimage', filename: name }) });
        if (!r.ok) throw new Error('Не удалось сохранить картинку в таверне (' + r.status + ')');
        return (await r.json()).path;
    }
    const toUrl = (u) => (/^(https?:|data:)/.test(l(u)) ? u : (u ? '/' + l(u).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/') : ''));

    // ---------------------------------------------------------------- сцены в метаданных чата
    function sceneOf(mesId) {
        const sc = meta().scenes;
        const k = String(mesId);
        if (!sc[k]) sc[k] = { id: uid(), status: '', vars: [], idx: -1, last: null, err: '', stage: '' };
        return sc[k];
    }
    function dropScene(mesId) { delete meta().scenes[String(mesId)]; saveMeta(); }

    // ---------------------------------------------------------------- мемо: запомнить внешность по картинке
    const MEMO_RX = /\b(hair|bangs|ponytails?|twintails|braids?|braided|hair bun|bob cut|hime cut|ahoge|sidelocks|undercut|buzz cut|bald|eyes|heterochromia|skin|skinned|freckles|moles?|beauty mark|scars?|tattoos?|glasses|eyepatch|piercings?|fangs?|ears|horns?|tails?|wings|halo|beard|mustache|stubble|facial hair|muscular|slender|slim|curvy|petite|tall|chubby|plump|athletic|broad shoulders|toned|makeup|lipstick|eyeliner|eyeshadow|eyelashes|flat chest|(?:small|medium|large|huge) breasts)\b/;
    const MEMO_SKIP = /#|^(closed|half-closed|half-open|narrowed|wide|teary|tearful|rolling|rolled|covered|empty|blank|dull|sparkling|shining|crying|wet|messy|disheveled|floating|flowing|tousled|glowing|sleepy|tired|bloodshot|heart-shaped|spiral) |hand|finger|touch|grab|pull|tuck|adjust|hold|look|cover|wip|rub|through|hair (down|up|over|blowing|flowing)|motion|sweat|blush|tears|eyes closed/;
    function memoFromTags(text) {
        const out = [];
        l(text).split(',').forEach((t) => {
            const n = normTag(t);
            if (!n || n.length > 40) return;
            if (/^(girl|boy|other)$/.test(n)) return;
            if (/(left|right) side|^center$|foreground|background/.test(n)) return;
            if (MEMO_RX.test(n) && !MEMO_SKIP.test(n) && out.indexOf(n) < 0) out.push(n);
        });
        return out.slice(0, 14);
    }
    function applyMemo(comp, looks) {
        const s = S();
        if (!s.memo || !comp.match || !comp.match.length) return;
        let changed = false;
        comp.match.forEach((mt) => {
            const lk = looks[mt.i];
            if (!lk || l(lk.app).trim()) return;
            const tags = memoFromTags(mt.t);
            if (tags.length < 2) return;
            lk.app = tags.join(', ');
            lk.auto = 1;
            if (!lk.g) lk.g = genderFrom(mt.t) || '';
            saveLook(lk);
            changed = true;
        });
        if (changed) toast('success', 'Внешность запомнена по первой картинке ✨');
    }

    // ---------------------------------------------------------------- генерация
    const busy = new Map(); // mesId -> {stage, t0}
    let abortCtl = null;
    const STAGE_TXT = { llm: 'Пишу промпт (LLM)…', nai: 'Рисую в NovelAI…', proxy: 'Рисую через прокси…', ns: 'Рисую в Naistera…', wait429: 'Сервер занят (429), жду…', save: 'Сохраняю…' };
    function setStage(mesId, stage) { const b = busy.get(Number(mesId)); if (b) { b.stage = stage; b.ts = now(); } renderBars(); }
    const stageFn = (mesId) => (st) => setStage(mesId, STAGE_TXT[st] || st);

    async function run(mesId, opts) {
        opts = opts || {};
        const s = S();
        if (busy.size) { toast('info', 'Уже идёт генерация — подожди или нажми «Стоп»'); return; }
        const msg = ctx().chat[mesId];
        if (!msg) return;
        busy.set(Number(mesId), { stage: 'Подготовка…', t0: now(), ts: now() });
        abortCtl = new AbortController();
        renderBars();
        try {
            const sc = sceneOf(mesId);
            sc.status = 'pending'; sc.err = ''; sc.stage = '';
            // 1) промпт: маркер из сообщения или LLM-писатель
            let ratio = '', desc = '';
            const marker = findMarker(msg.mes || '');
            if (opts.prompt) { desc = opts.prompt; ratio = opts.ratio || (marker ? marker.ratio : '3:2'); }
            else if (marker && !opts.rewrite) { ratio = marker.ratio; desc = marker.desc; }
            else if (s.writer === 'api' || opts.rewrite || !marker) {
                const mk = await apiWrite(mesId, stageFn(mesId));
                ratio = mk.ratio; desc = mk.desc;
            }
            if (!desc) throw mkErr('noprompt', 'Не удалось получить промпт сцены');
            // 2) композиция
            const looks = collectLooks();
            const style = activeStyle(s), neg = activeNeg(s);
            let styleTags = style ? w(style.tags) : '';
            let negUser = neg ? w(neg.text) : '';
            const comp = compose(desc, looks);
            if (s.provider === 'nai' || s.provider === 'naiproxy') {
                if (styleTags) comp.base = w(styleTags + ', ' + comp.base);
            }
            styleTags = applyGuards(comp, styleTags);
            if (comp.guard) negUser = xmerge(negUser, comp.gneg);
            if (abortCtl.signal.aborted) throw mkErr('abort', 'Остановлено');
            // 3) провайдер
            const seed = Math.floor(4294967295 * Math.random());
            const token = s.provider === 'naistera' ? s.nsToken : s.naiToken;
            let res;
            if (s.provider === 'nai') res = await naiGenerate(s.nai, token, comp, negUser, seed, ratio, stageFn(mesId));
            else if (s.provider === 'naiproxy') res = await proxyGenerate(s, token, comp, negUser, seed, ratio, styleTags, stageFn(mesId));
            else res = await nsGenerate(s, token, comp, negUser, seed, ratio, styleTags, stageFn(mesId));
            if (abortCtl.signal.aborted) throw mkErr('abort', 'Остановлено');
            // 4) сохранить
            setStage(mesId, 'save');
            const path = await uploadImage(res.data, 'shark_' + now().toString(36) + '_' + uid());
            const variant = {
                f: path, seed: seed, at: now(), p: s.provider,
                m: s.provider === 'naistera' ? 'ns:' + s.ns.model : s.nai.model,
                w: res.w, h: res.h,
                style: style ? w(style.tags) : '',
                steps: s.provider === 'naistera' ? 0 : (isMedium(s.nai.model) ? 14 : s.nai.steps),
                scale: s.provider === 'naistera' ? 0 : s.nai.scale,
            };
            sc.vars.push(variant);
            sc.idx = sc.vars.length - 1;
            sc.last = { base: cut(res.req.base, 3000), chars: (res.req.chars || []).map((t) => cut(t, 800)), neg: cut(res.req.neg, 1500), hit: Object.keys(comp.hit) };
            sc.status = 'done'; sc.err = ''; sc.stage = '';
            saveMeta();
            // мемо
            try { applyMemo(comp, looks); } catch (e) { console.warn('[sharkimage] memo', e); }
            try { rememberLayout(ratio, comp); } catch (e) { }
            // якорь в текст сообщения (чтобы сцена не терялась при редактировании)
            try {
                if (l(msg.mes).indexOf(anchor(sc.id)) < 0) {
                    msg.mes = l(msg.mes).trimEnd() + '\n' + anchor(sc.id);
                    saveMeta();
                }
            } catch (e) { }
            attachMedia(mesId);
            toast('success', 'Картинка готова ✨');
        } catch (e) {
            if (e && e.code === 'abort') {
                toast('info', 'Генерация остановлена');
            } else {
                const sc = sceneOf(mesId);
                sc.status = 'error'; sc.err = l(e && e.message ? e.message : e).slice(0, 300); sc.stage = '';
                saveMeta();
                toast('error', 'Не вышло: ' + sc.err);
            }
        } finally {
            busy.delete(Number(mesId));
            abortCtl = null;
            renderBars();
        }
    }

    function attachMedia(mesId) {
        const cc = ctx();
        const msg = cc.chat[mesId];
        const sc = sceneOf(mesId);
        const v = sc.vars[sc.idx];
        if (!msg || !v) return;
        if (!msg.extra || typeof msg.extra !== 'object') msg.extra = {};
        if (!Array.isArray(msg.extra.media)) msg.extra.media = [];
        if (!msg.extra.media.length) { msg.extra.media_display = 'gallery'; msg.extra.inline_image = false; }
        // убрать старые записи sharkimage для этого сообщения, добавить новую
        msg.extra.media = msg.extra.media.filter((m) => !m || m.source !== 'sharkimage');
        msg.extra.media.push({
            url: toUrl(v.f), type: 'image', source: 'sharkimage',
            title: sc.last ? sc.last.base : '',
            shark: { seed: v.seed, model: v.m, provider: v.p },
        });
        msg.extra.media_index = msg.extra.media.length - 1;
        try { if (Array.isArray(msg.swipe_info) && msg.swipe_info[msg.swipe_id] && typeof msg.swipe_info[msg.swipe_id] === 'object') msg.swipe_info[msg.swipe_id].extra = deep(msg.extra); } catch (e) { }
        try { cc.saveChat(); } catch (e) { }
        let attached = false;
        const mesEl = document.querySelector(`#chat .mes[mesid="${mesId}"]`);
        try { if (typeof cc.appendMediaToMessage === 'function' && mesEl) { cc.appendMediaToMessage(msg, mesEl); attached = true; } } catch (e) { console.warn('[sharky2] appendMediaToMessage', e); }
        if (!attached) { // запасной путь: просто вставить <img> под текст сообщения
            try {
                const root = mesEl && (mesEl.querySelector('.mes_text') || mesEl);
                if (root) {
                    let slot = mesEl.querySelector('.shk2-img');
                    if (!slot) { slot = document.createElement('div'); slot.className = 'shk2-img'; root.after(slot); }
                    slot.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = toUrl(v.f); img.className = 'shk2-fallback-img'; img.alt = 'scene';
                    slot.appendChild(img);
                }
            } catch (e) { console.warn('[sharky2] fallback img', e); }
        }
        renderBars();
    }
    function showVariant(mesId, d) {
        const msg = ctx().chat[mesId];
        const sc = sceneOf(mesId);
        if (!msg || !sc.vars.length) return;
        sc.idx = (ival(sc.idx, 0, 0, sc.vars.length - 1) + d + sc.vars.length) % sc.vars.length;
        saveMeta();
        attachMedia(mesId);
    }
    function downloadVariant(mesId) {
        const sc = sceneOf(mesId);
        const v = sc.vars[ival(sc.idx, 0, 0, Math.max(0, sc.vars.length - 1))];
        if (!v) return;
        const a = document.createElement('a');
        a.href = toUrl(v.f);
        a.download = 'shark_' + (v.seed || now()) + '.png';
        document.body.appendChild(a); a.click(); a.remove();
    }

    // ---------------------------------------------------------------- подсветка кнопок/статуса под сообщением
    const fmtSec = (ms) => { const s = Math.floor(ms / 1000); return (s >= 60 ? Math.floor(s / 60) + 'м ' : '') + (s % 60) + 'с'; };
    let barsTimer = null;
    function renderBars() { clearTimeout(barsTimer); barsTimer = setTimeout(renderBarsNow, 30); }
    function renderBarsNow() {
        const s = S();
        const cc = ctx();
        document.querySelectorAll('#chat .mes').forEach((mesEl) => {
            const id = Number(mesEl.getAttribute('mesid'));
            const msg = cc.chat[id];
            const old = mesEl.querySelector(':scope > .shk-bar') || mesEl.querySelector('.shk-bar');
            if (!msg || msg.is_user || msg.is_system) { if (old) old.remove(); return; }
            const sc = meta().scenes[String(id)];
            const marker = findMarker(msg.mes || '');
            const b = busy.get(id);
            let html = '';
            const errTxt = sc && sc.status === 'error' ? sc.err : '';
            if (b) {
                html = `<div class="shk-stage"><span class="fa-solid fa-spinner fa-spin"></span> ${esc(b.stage || 'Работаю…')} <span class="shk-timer" data-t0="${b.t0}">${fmtSec(now() - b.t0)}</span></div>
                        <div class="menu_button shk-b shk-stop" data-act="stop">✕ Стоп</div>`;
            } else {
                if (errTxt) html += `<div class="shk-err">⚠️ ${esc(errTxt)}</div>`;
                const canDraw = s.mode !== 'off' || (sc && sc.vars && sc.vars.length);
                if (marker && canDraw && (!sc || sc.status !== 'done')) {
                    html += `<div class="menu_button shk-b shk-main" data-act="draw" title="Нарисовать сцену из маркера">🖼 Нарисовать сцену</div>`;
                }
                if (s.writer === 'api' && s.mode !== 'off' && !marker) {
                    html += `<div class="menu_button shk-b shk-main" data-act="drawapi" title="LLM сам опишет сцену и нарисует">🦈 Shark: придумать сцену</div>`;
                }
                if (sc && sc.vars && sc.vars.length) {
                    const n = sc.vars.length;
                    const ci = ival(sc.idx, 0, 0, n - 1) + 1;
                    html += `<div class="shk-nav"><div class="menu_button shk-b" data-act="prev" title="Предыдущий вариант">‹</div><span>${ci}/${n}</span><div class="menu_button shk-b" data-act="next" title="Следующий вариант">›</div></div>`;
                    html += `<div class="menu_button shk-b" data-act="more" title="Нарисовать ещё вариант этой сцены">＋ Ещё вариант</div>`;
                    html += `<div class="menu_button shk-b" data-act="prompt" title="Показать/править промпт">Промпт</div>`;
                    html += `<div class="menu_button shk-b" data-act="info" title="Что именно ушло в генерацию">Инфо</div>`;
                    html += `<div class="menu_button shk-b" data-act="dl" title="Скачать">⬇</div>`;
                    html += `<div class="menu_button shk-b" data-act="del" title="Убрать сцену (картинка останется в медиа)">🗑</div>`;
                }
            }
            const key = (b ? 'b' + b.stage + b.ts : 'i') + '|' + (errTxt || '') + '|' + (sc && sc.vars ? sc.vars.length + ':' + sc.idx : '') + '|' + (marker ? 'm' : '') + '|' + s.mode + s.writer;
            if (old && old.dataset.k === key) return;
            if (old) old.remove();
            const bar = document.createElement('div');
            bar.className = 'shk-bar';
            bar.dataset.k = key;
            bar.innerHTML = html;
            const wrap = mesEl.querySelector('.mes_media_wrapper');
            if (wrap) wrap.after(bar); else { const mt = mesEl.querySelector('.mes_text'); if (mt) mt.after(bar); else mesEl.appendChild(bar); }
            // восстановить запасную картинку после перерисовки чата (только если нет нативных media)
            try {
                const native = typeof cc.appendMediaToMessage === 'function';
                let slot = mesEl.querySelector('.shk2-img');
                if (!native && sc && sc.vars && sc.vars.length) {
                    const v0 = sc.vars[ival(sc.idx, 0, 0, sc.vars.length - 1)];
                    if (v0) {
                        if (!slot) {
                            slot = document.createElement('div'); slot.className = 'shk2-img';
                            const mt = mesEl.querySelector('.mes_text');
                            if (mt) mt.after(slot); else mesEl.appendChild(slot);
                        }
                        if (!slot.querySelector('img')) {
                            slot.innerHTML = '';
                            const img = document.createElement('img');
                            img.src = toUrl(v0.f); img.className = 'shk2-fallback-img'; img.alt = 'scene';
                            slot.appendChild(img);
                        }
                    }
                } else if (slot && native) slot.remove();
            } catch (e) { }
        });
        hideMarkers();
    }
    setInterval(() => { document.querySelectorAll('#chat .shk-timer').forEach((el) => { el.textContent = fmtSec(now() - Number(el.dataset.t0)); }); }, 500);

    // скрыть маркеры и якоря в отображаемых сообщениях
    function hideMarkers() {
        const RGX = /\[(?:[A-ZА-ЯЁ]{2,24}_)?SCENE:\s*[^\]]*?\s*\]|<!--scene:[a-z0-9]{4,40}-->/g;
        document.querySelectorAll('#chat .mes').forEach(function (mesEl) {
            const root = mesEl.querySelector('.mes_text');
            if (!root || root.dataset.shkClean) return;
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            const nodes = [];
            let n;
            while ((n = walker.nextNode())) { if (RGX.test(n.nodeValue)) nodes.push(n); RGX.lastIndex = 0; }
            nodes.forEach((node) => {
                const frag = document.createDocumentFragment();
                let last = 0, m;
                RGX.lastIndex = 0;
                while ((m = RGX.exec(node.nodeValue))) {
                    if (m.index > last) frag.appendChild(document.createTextNode(node.nodeValue.slice(last, m.index)));
                    const sp = document.createElement('span');
                    sp.className = 'shk-hidden-marker';
                    sp.textContent = m[0];
                    frag.appendChild(sp);
                    last = m.index + m[0].length;
                }
                if (last < node.nodeValue.length) frag.appendChild(document.createTextNode(node.nodeValue.slice(last)));
                node.parentNode.replaceChild(frag, node);
            });
            if (nodes.length) root.dataset.shkClean = '1';
        });
    }
    const unhideMarkers = (mesId) => {
        const el = document.querySelector(`#chat .mes[mesid="${mesId}"] .mes_text`);
        if (el) { delete el.dataset.shkClean; hideMarkers(); }
    };

    // ---------------------------------------------------------------- модалки
    function modal(html) {
        const w = document.createElement('div');
        w.className = 'shk-overlay';
        w.innerHTML = `<div class="shk-modal">${html}</div>`;
        document.body.appendChild(w);
        return w;
    }
    function promptBox(mesId) {
        const sc = sceneOf(mesId);
        const mk = findMarker(ctx().chat[mesId].mes || '');
        const cur = sc.last;
        const curText = cur ? [cur.base].concat(cur.chars || []).join(' | ') : (mk ? mk.desc : '');
        const w = modal(`<div class="shk-mh">Промпт сцены</div>
            <div class="shk-mrow"><span>Формат: <code>RATIO | база | @Имя, теги персонажа | …</code></span></div>
            <textarea id="shk_prompt" class="shk-ta" rows="7">${esc(curText)}</textarea>
            <div class="shk-mbtns">
                <div class="menu_button shk-b" data-x="save">Перерисовать с этим промптом</div>
                <div class="menu_button shk-b" data-x="close">Закрыть</div>
            </div>`);
        w.addEventListener('click', (e) => { if (e.target === w) w.remove(); });
        w.querySelector('[data-x="close"]').onclick = () => w.remove();
        w.querySelector('[data-x="save"]').onclick = () => {
            const t = w.querySelector('#shk_prompt').value.trim();
            w.remove();
            if (t) run(mesId, { prompt: t });
        };
    }
    function infoBox(mesId) {
        const sc = sceneOf(mesId);
        const v = sc.vars[ival(sc.idx, 0, 0, Math.max(0, (sc.vars || []).length - 1))];
        const cur = sc.last || {};
        const looks = collectLooks();
        const hitNames = (cur.hit || []).map((k) => { const lk = looks.filter((x) => x.key === k)[0]; return lk ? lk.name : k; });
        const w = modal(`<div class="shk-mh">Инфо о генерации</div>
            <div class="shk-info">
            <div><b>Модель:</b> ${esc(v ? v.m : '—')}</div>
            <div><b>Сид:</b> ${esc(v ? v.seed : '—')}</div>
            <div><b>Размер:</b> ${esc(v ? (v.w + '×' + v.h) : '—')}</div>
            ${v && v.steps ? `<div><b>Шаги/гиданс:</b> ${esc(v.steps)} / ${esc(v.scale)}</div>` : ''}
            ${hitNames.length ? `<div><b>Внешности применены:</b> ${esc(hitNames.join(', '))}</div>` : ''}
            <div class="shk-infop"><b>База:</b><br>${esc(cur.base || '—')}</div>
            ${(cur.chars || []).map((t, i) => `<div class="shk-infop"><b>Персонаж ${i + 1}:</b><br>${esc(t)}</div>`).join('')}
            <div class="shk-infop"><b>Негатив:</b><br>${esc(cur.neg || '—')}</div>
            </div>
            <div class="shk-mbtns"><div class="menu_button shk-b" data-x="close">Закрыть</div></div>`);
        w.addEventListener('click', (e) => { if (e.target === w) w.remove(); });
        w.querySelector('[data-x="close"]').onclick = () => w.remove();
    }

    // ---------------------------------------------------------------- действия кнопок
    async function barAction(mesId, act) {
        const s = S();
        if (act === 'stop') { if (abortCtl) { try { abortCtl.abort(); } catch (e) { } } return; }
        if (act === 'draw') return run(mesId);
        if (act === 'drawapi') return run(mesId, { rewrite: true });
        if (act === 'prev') return showVariant(mesId, -1);
        if (act === 'next') return showVariant(mesId, 1);
        if (act === 'more') {
            const sc = sceneOf(mesId);
            if (sc.last) {
                const mk = findMarker(ctx().chat[mesId].mes || '');
                const t = [sc.last.base].concat(sc.last.chars || []).join(' | ');
                return run(mesId, { prompt: t, ratio: mk ? mk.ratio : '3:2' });
            }
            return run(mesId);
        }
        if (act === 'prompt') return promptBox(mesId);
        if (act === 'info') return infoBox(mesId);
        if (act === 'dl') return downloadVariant(mesId);
        if (act === 'del') { if (confirm('Убрать сцену Sharky 2 из этого сообщения?')) { dropScene(mesId); renderBars(); } return; }
    }

    // ---------------------------------------------------------------- панель настроек
    const NAI_MODELS = [
        ['nai-diffusion-5-full', 'NovelAI V5 Full'],
        ['nai-diffusion-5-curated', 'NovelAI V5 Curated'],
        ['nai-diffusion-5-full-medium', 'NovelAI V5 Full · Medium'],
        ['nai-diffusion-4-5-full', 'NovelAI V4.5 Full'],
        ['nai-diffusion-4-5-curated', 'NovelAI V4.5 Curated'],
    ];
    const opt = (v, cur, name) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(name || v)}</option>`;

    function renderSettings() {
        const s = S();
        const fam = provFamily(s);
        const tabs = [['main', 'Основное'], ['looks', 'Внешность'], ['presets', 'Пресеты'], ['api', 'API']];
        const tab = s.tab && tabs.some((t) => t[0] === s.tab) ? s.tab : 'main';
        return `<div class="shk-always">
            <div class="shk-always-head"><b>🦈 Sharky 2</b> <span class="shk-ver">v${VER}</span></div>
            <div class="shk-always-body">
                <div class="shk-tabs">${tabs.map((t) => `<div class="menu_button shk-tab ${t[0] === tab ? 'active' : ''}" data-tab="${t[0]}">${t[1]}</div>`).join('')}</div>
                <div class="shk-body">${tab === 'main' ? tabMain() : tab === 'looks' ? tabLooks() : tab === 'presets' ? tabPresets() : tabApi()}</div>
            </div>
        </div>`;
    }

    function tabMain() {
        const s = S();
        const fam = provFamily(s);
        const naiBlock = `
            <div class="shk-row"><label>Модель</label><select data-s="nai.model">${NAI_MODELS.map((m) => opt(m[0], s.nai.model, m[1])).join('')}</select></div>
            <div class="shk-row"><label>Размер</label><select data-s="nai.size">${opt('small', s.nai.size, 'Малый') + opt('normal', s.nai.size, 'Обычный') + opt('big', s.nai.size, 'Большой')}</select></div>
            <div class="shk-row"><label>Качество</label><select data-s="nai.quality">${opt('standard', s.nai.quality, 'Стандарт') + opt('light', s.nai.quality, 'Лёгкое') + opt('none', s.nai.quality, 'Без тегов')}</select></div>
            <div class="shk-row"><label>Негатив (UC)</label><select data-s="nai.uc">${opt('heavy', s.nai.uc, 'Сильный') + opt('light', s.nai.uc, 'Лёгкий') + opt('human', s.nai.uc, 'Люди') + opt('none', s.nai.uc, 'Без пресета')}</select></div>
            <div class="shk-row"><label>Шаги</label><input type="number" min="1" max="50" data-s="nai.steps" value="${esc(s.nai.steps)}"></div>
            <div class="shk-row"><label>Гиданс</label><input type="number" min="1" max="20" step="0.5" data-s="nai.scale" value="${esc(s.nai.scale)}"></div>
            <div class="shk-row"><label>Сэмплер</label><select data-s="nai.sampler">${['k_euler_ancestral', 'k_euler', 'k_dpmpp_2s_ancestral', 'k_dpmpp_2m_sde_ancestral', 'k_dpmpp_2m', 'k_dpmpp_sde', 'ddim'].map((v) => opt(v, s.nai.sampler)).join('')}</select></div>
            <div class="shk-row"><label>Шум</label><select data-s="nai.noise">${['karras', 'exponential', 'polyexponential'].map((v) => opt(v, s.nai.noise)).join('')}</select></div>`;
        const nsBlock = `
            <div class="shk-row"><label>Модель</label><input type="text" data-s="ns.model" value="${esc(s.ns.model)}" placeholder="novelai-v4.5"></div>
            <div class="shk-row"><label>Качество</label><select data-s="ns.quality">${opt('standard', s.ns.quality, 'Стандарт') + opt('light', s.ns.quality, 'Лёгкое') + opt('none', s.ns.quality, 'Без тегов')}</select></div>
            <div class="shk-row"><label>Негатив для «medium»</label><input type="checkbox" data-s="nsMediumNeg" ${(s.ns.cat || []).some((c) => c.id === s.ns.model) ? '' : 'checked'} title="По умолчанию у medium-моделей негатив отключён — как в оригинале"></div>`;
        return `
        <div class="shk-note">Порт плагина «Shark Image 1.7.0» (Akula). Рисует NovelAI по маркеру <code>[SCENE: RATIO | PROMPT]</code> в конце ответа персонажа.</div>
        <div class="shk-row"><label>Режим</label><select data-s="mode">${opt('auto', s.mode, 'Авто (по маркеру)') + opt('manual', s.mode, 'Вручную (кнопкой)') + opt('off', s.mode, 'Выключен')}</select></div>
        <div class="shk-row"><label>Писатель промпта</label><select data-s="writer">${opt('inline', s.writer, 'Inline — инъекция в чат (модель пишет маркер)') + opt('api', s.writer, 'API — своё LLM подключение')}</select></div>
        <div class="shk-row"><label>Провайдер картинок</label><select data-s="provider">${opt('nai', s.provider, 'NovelAI (официальный API)') + opt('naiproxy', s.provider, 'NovelAI через прокси') + opt('naistera', s.provider, 'Naistera')}</select></div>
        ${s.provider === 'naistera' ? nsBlock : naiBlock}
        <hr>
        <div class="shk-row"><label>Контекст LLM (сообщ.)</label><input type="number" min="0" max="20" data-s="ctxN" value="${esc(s.ctxN)}"></div>
        <div class="shk-row"><label>Референсы из карточек</label><input type="checkbox" data-s="refs" ${s.refs ? 'checked' : ''}></div>
        <div class="shk-row"><label>Мемо-внешность</label><input type="checkbox" data-s="memo" ${s.memo ? 'checked' : ''} title="Запомнить внешность персонажа по первой картинке"></div>
        <div class="shk-note">Сейчас: <b>${fam === 'v5' ? 'V5' : 'V4'}</b> · шаблон «${esc((activePrompt(s) || {}).name || '—')}» · стиль «${esc((activeStyle(s) || {}).name || '—')}»</div>`;
    }

    function tabLooks() {
        const looks = collectLooks();
        const kindName = (k) => k === 'u' ? 'персона пользователя' : k === 'n' ? 'NPC' : 'персонаж';
        const rows = looks.map((lk) => `
            <div class="shk-look" data-key="${esc(lk.key)}" data-kind="${lk.kind}" data-id="${esc(lk.id)}" data-name="${esc(lk.name)}">
                <div class="shk-lookh"><b>${esc(lk.name)}</b> <span class="shk-kind">${kindName(lk.kind)}</span>${lk.auto ? ' <span class="shk-auto" title="запомнено автоматически">🤖</span>' : ''}${lk.kind === 'c' ? `<div class="menu_button shk-mini" data-look-fill="${esc(lk.key)}">Из карточки</div>` : ''}</div>
                <div class="shk-row"><label>Внешность (теги)</label><textarea class="shk-ta" rows="3" data-look="app">${esc(lk.app)}</textarea></div>
                <div class="shk-row"><label>Одежда (теги)</label><input type="text" data-look="cloth" value="${esc(lk.cloth)}"></div>
                <div class="shk-row3">
                    <div class="shk-row"><label>Пол</label><select data-look="g">${opt('', lk.g, '—') + opt('girl', lk.g, 'girl') + opt('boy', lk.g, 'boy') + opt('other', lk.g, 'other')}</select></div>
                    <div class="shk-row"><label>Алиасы (через запятую)</label><input type="text" data-look="alias" value="${esc(lk.alias)}"></div>
                    <div class="shk-row"><label>Свой негатив</label><input type="text" data-look="neg" value="${esc(lk.neg)}"></div>
                </div>
                <div class="shk-mbtns"><div class="menu_button shk-mini" data-look-save="${esc(lk.key)}">Сохранить</div></div>
            </div>`).join('');
        return `
        <div class="shk-note">Внешности хранятся в этом чате. Лук подставляется в блок персонажа по метке <code>@Имя,</code> или по упоминанию имени в промпте. Не указывай внешность — плагин сам запомнит её с первой картинки (мемо).</div>
        ${rows || '<div class="shk-note">В чате пока нет персонажей.</div>'}
        <hr>
        <div class="shk-row"><label>Новый NPC</label><input type="text" id="shk_npcname" placeholder="Имя NPC"></div>
        <div class="shk-mbtns"><div class="menu_button shk-mini" data-npc-add="1">Добавить NPC</div></div>`;
    }

    function tabPresets() {
        const s = S();
        const lb = lib();
        const fam = provFamily(s);
        const ed = s.edit || {};
        const cur = (arr, id) => libFind(arr, id) || arr[0] || null;
        const tpl = cur(lb.prompts, ed.tpl);
        const sty = cur(lb.styles, ed.sty);
        const neg = cur(lb.negs, ed.neg);
        const famName = (f) => f === 'v4' ? 'V4' : f === 'v5' ? 'V5' : 'любой';
        const section = (title, arr, kind, curId, edId, extra) => `
            <div class="shk-sech">${title}</div>
            <div class="shk-row"><label>Редактировать</label><select data-ed="${edId}">${arr.map((p) => opt(p.id, curId, p.name + (p.kind ? ' · ' + p.kind : '') + (p.fam ? ' · ' + famName(p.fam) : ''))).join('')}</select></div>
            ${extra || ''}
            <div class="shk-row"><label>Название</label><input type="text" data-edname="${edId}" value="${esc((arr.filter((p) => p.id === curId)[0] || {}).name || '')}"></div>
            <textarea class="shk-ta" rows="${kind === 'prompt' ? 10 : 4}" data-edtext="${edId}">${esc((arr.filter((p) => p.id === curId)[0] || {})[kind === 'neg' ? 'text' : 'tags'] || (arr.filter((p) => p.id === curId)[0] || {}).text || '')}</textarea>
            <div class="shk-mbtns">
                <div class="menu_button shk-mini" data-preset-save="${edId}" data-kind="${kind}">Сохранить</div>
                <div class="menu_button shk-mini" data-preset-new="${edId}" data-kind="${kind}">Новый</div>
                <div class="menu_button shk-mini" data-preset-dup="${edId}" data-kind="${kind}">Дублировать</div>
                <div class="menu_button shk-mini shk-danger" data-preset-del="${edId}" data-kind="${kind}">Удалить</div>
            </div>`;
        return `
        <div class="shk-note">Активные для текущего семейства (<b>${fam}</b>): шаблон «${esc((activePrompt(s) || {}).name || '—')}», стиль «${esc((activeStyle(s) || {}).name || '—')}», негатив «${esc((activeNeg(s) || {}).name || '—')}».</div>
        <div class="shk-row3">
            <div class="shk-row"><label>Активный шаблон V5</label><select data-active="promptId">${lb.prompts.filter((p) => kindOk(p.kind, 'v5')).map((p) => opt(p.id, s.promptId)).join('')}</select></div>
            <div class="shk-row"><label>Активный шаблон V4</label><select data-active="promptIdV4">${lb.prompts.filter((p) => kindOk(p.kind, 'v4')).map((p) => opt(p.id, s.promptIdV4)).join('')}</select></div>
        </div>
        <div class="shk-row3">
            <div class="shk-row"><label>Стиль V5</label><select data-active="styleId">${lb.styles.filter((p) => p.fam === 'v5').map((p) => opt(p.id, s.styleId)).join('')}</select></div>
            <div class="shk-row"><label>Стиль V4</label><select data-active="styleIdV4">${lb.styles.filter((p) => p.fam === 'v4').map((p) => opt(p.id, s.styleIdV4)).join('')}</select></div>
        </div>
        <div class="shk-row3">
            <div class="shk-row"><label>Негатив V5</label><select data-active="negId">${lb.negs.filter((p) => p.fam === 'v5').map((p) => opt(p.id, s.negId)).join('')}</select></div>
            <div class="shk-row"><label>Негатив V4</label><select data-active="negIdV4">${lb.negs.filter((p) => p.fam === 'v4').map((p) => opt(p.id, s.negIdV4)).join('')}</select></div>
        </div>
        <hr>
        ${section('Шаблоны промптов (инструкции для LLM)', lb.prompts, 'prompt', tpl ? tpl.id : '', 'tpl',
            `<div class="shk-row"><label>Тип</label><select data-edkind="tpl">${KINDS.map((k) => opt(k, tpl ? tpl.kind : 'custom')).join('')}</select></div>`)}
        <hr>
        ${section('Стили (теги в начало промпта)', lb.styles, 'style', sty ? sty.id : '', 'sty')}
        <hr>
        ${section('Негативные пресеты', lb.negs, 'neg', neg ? neg.id : '', 'neg')}`;
    }

    function tabApi() {
        const s = S();
        const conns = s.api.list || [];
        const conn = findConn(s.apiId) || conns[0] || null;
        const rows = conns.map((cn) => `
            <div class="shk-conn" data-cid="${esc(cn.id)}">
                <div class="shk-lookh"><b>${esc(cn.name || cn.model || cn.id)}</b> <span class="shk-kind">${esc(cn.platform)}</span></div>
                <div class="shk-row"><label>Платформа</label><select data-c="platform">${PLATFORMS.map((p) => opt(p[0], cn.platform, p[1])).join('')}</select></div>
                <div class="shk-row"><label>Base URL</label><input type="text" data-c="base" value="${esc(cn.base || '')}" placeholder="https://…"></div>
                <div class="shk-row"><label>Ключ</label><input type="password" data-c="key" value="${esc(cn.key || '')}"></div>
                <div class="shk-row"><label>Модель</label><input type="text" data-c="model" value="${esc(cn.model || '')}"></div>
                <div class="shk-mbtns">
                    <div class="menu_button shk-mini" data-conn-save="${esc(cn.id)}">Сохранить</div>
                    <div class="menu_button shk-mini" data-conn-test="${esc(cn.id)}">Тест</div>
                    <div class="menu_button shk-mini shk-danger" data-conn-del="${esc(cn.id)}">Удалить</div>
                </div>
            </div>`).join('');
        return `
        <div class="shk-row"><label>Токен NovelAI</label><input type="password" data-tok="naiToken" value="${esc(s.naiToken)}" placeholder="pst-…"></div>
        <div class="shk-row"><label>Токен Naistera</label><input type="password" data-tok="nsToken" value="${esc(s.nsToken)}"></div>
        <div class="shk-row"><label>Прокси URL</label><input type="text" data-s="proxy.url" value="${esc(s.proxy.url)}" placeholder="https://…"></div>
        <div class="shk-row"><label>Токен в прокси</label><input type="checkbox" data-s="proxy.sendTok" ${s.proxy.sendTok ? 'checked' : ''}></div>
        <div class="shk-mbtns"><div class="menu_button shk-mini" data-check-nai="1">Проверить NovelAI</div></div>
        <hr>
        <div class="shk-sech">LLM-подключения (писатель «API»)</div>
        <div class="shk-row"><label>Активное</label><select data-active="apiId">${conns.map((cn) => opt(cn.id, s.apiId, cn.name || cn.model || cn.id)).join('')}</select></div>
        ${rows || '<div class="shk-note">Подключений нет — добавь своё (OpenAI-совместимое, Gemini или Anthropic).</div>'}
        <div class="shk-mbtns"><div class="menu_button shk-mini" data-conn-add="1">Добавить подключение</div></div>
        <div class="shk-note">Ключи хранятся в настройках Таверны в открытом виде, как у любого расширения.</div>`;
    }

    // ---------------------------------------------------------------- монтирование и привязка панели
    function mountSettings() {
        let host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
        if (!host) {
            bootLog('mount: панель extensions не найдена — вешаю в body');
            host = document.body;
        }
        bootLog('mount: панель смонтирована в #' + host.id);
        let box = document.getElementById('shk_box');
        const scroll = box ? box.querySelector('.shk-body')?.scrollTop : 0;
        if (!box) { box = document.createElement('div'); box.id = 'shk_box'; host.appendChild(box); bindSettings(box); }
        box.innerHTML = renderSettings();
        const b = box.querySelector('.shk-body'); if (b && scroll) b.scrollTop = scroll;
    }
    // ---------------------------------------------------------------- модальное окно настроек + кнопка в топ-баре
    let shkModal = null;
    function renderModalBody() {
        if (!shkModal) return;
        const body = shkModal.querySelector('#shk_modal_body');
        if (!body) return;
        const sc = body.querySelector('.shk-body') ? body.querySelector('.shk-body').scrollTop : 0;
        body.innerHTML = renderSettings();
        if (sc) { const b2 = body.querySelector('.shk-body'); if (b2) b2.scrollTop = sc; }
    }
    function refreshAll() { mountSettings(); renderModalBody(); renderBars(); }
    function openShkModal() {
        if (!shkModal) {
            shkModal = document.createElement('div');
            shkModal.id = 'shk_modal';
            shkModal.style.zIndex = '10001';
            shkModal.style.display = 'none';
            shkModal.innerHTML = `<div class="shk-modal-bg"><div class="shk-modal"><div class="shk-modal-head"><b>🦈 Sharky 2</b> <span class="shk-ver">v${VER}</span><div class="menu_button shk-mini shk-modal-x">✕</div></div><div class="shk-modal-body" id="shk_modal_body"></div></div></div>`;
            document.body.appendChild(shkModal);
            shkModal.querySelector('.shk-modal-x').addEventListener('click', () => { shkModal.style.display = 'none'; });
            shkModal.querySelector('.shk-modal-bg').addEventListener('click', (e) => { if (e.target.classList.contains('shk-modal-bg')) shkModal.style.display = 'none'; });
            bindSettings(shkModal);
        }
        renderModalBody();
        shkModal.style.display = 'block';
    }
    function addToolbarButton() {
        const old = document.getElementById('shk_tb');
        if (old) old.remove();
        const btn = document.createElement('div');
        btn.id = 'shk_tb';
        btn.title = 'Sharky — настройки и генерация';
        btn.textContent = '🦈';
        btn.addEventListener('click', () => { try { openShkModal(); bootLog('модалка открыта'); } catch (e) { bootErr('модалка', e); } });
        document.body.appendChild(btn);
        bootLog('кнопка 🦈 добавлена (плавающая)');
    }

    const toast = (type, text) => { try { toastr[type](text, '🦈 Sharky 2'); } catch (e) { console.log('[sharkimage]', text); } };

    function setPath(obj, path, val) {
        const p = path.split('.');
        let o = obj;
        for (let i = 0; i < p.length - 1; i++) { if (!o[p[i]]) o[p[i]] = {}; o = o[p[i]]; }
        o[p[p.length - 1]] = val;
    }
    function bindSettings(box) {
        // мини-делегатор событий без jQuery: on(evt, sel, fn)
        const on = (evt, sel, fn) => box.addEventListener(evt, (e) => { const t = e.target.closest(sel); if (t && box.contains(t)) fn.call(t, e); });
        const find1 = (sel) => box.querySelector(sel);
        on('click', '.shk-tab', function () { S().tab = this.dataset.tab; save(); refreshAll(); });
        on('change', '[data-s]', function () {
            const s = S();
            const k = this.dataset.s;
            let v = this.type === 'checkbox' ? this.checked : this.value;
            if (['nai.steps', 'ctxN'].includes(k)) v = ival(v, k === 'ctxN' ? 4 : 28, 1, k === 'ctxN' ? 20 : 50);
            else if (k === 'nai.scale') v = clamp(v, 5, 1, 20);
            else if (k === 'nsMediumNeg') {
                s.ns.cat = this.checked ? (s.ns.cat || []).filter((x) => x.id !== s.ns.model) : [...(s.ns.cat || []).filter((x) => x.id !== s.ns.model), { id: s.ns.model, neg: false }];
                save(); return;
            }
            setPath(s, k, v);
            save(); refreshAll();
        });
        on('change', '[data-tok]', function () { S()[this.dataset.tok] = this.value.trim(); save(); });
        on('change', '[data-active]', function () { S()[this.dataset.active] = this.value; save(); refreshAll(); });
        // внешности
        on('click', '[data-look-save]', function () {
            const row = this.closest('.shk-look');
            if (!row) return;
            const lk = {
                key: row.dataset.key, kind: row.dataset.kind, id: row.dataset.id, name: row.dataset.name,
                app: row.querySelector('[data-look="app"]').value, cloth: row.querySelector('[data-look="cloth"]').value,
                g: row.querySelector('[data-look="g"]').value, alias: row.querySelector('[data-look="alias"]').value,
                neg: row.querySelector('[data-look="neg"]').value,
            };
            saveLook(lk);
            toast('success', 'Внешность «' + lk.name + '» сохранена');
            refreshAll();
        });
        on('click', '[data-look-fill]', function () {
            const row = this.closest('.shk-look');
            if (!row) return;
            const nm = row.dataset.name;
            const ch = (ctx().characters || []).filter((x) => x && l(x.name).trim() === nm)[0];
            if (!ch || !ch.description) { toast('warning', 'В карточке нет описания'); return; }
            row.querySelector('[data-look="app"]').value = cut(plainify(ch.description), 1200);
            if (!row.querySelector('[data-look="g"]').value) row.querySelector('[data-look="g"]').value = genderFrom(ch.description) || '';
            toast('info', 'Вставлено из карточки — нажми «Сохранить»');
        });
        on('click', '[data-npc-add]', function () {
            const nm = ((find1('#shk_npcname') || {}).value || '').trim();
            if (!nm) return;
            const m = meta();
            if (m.npcs.some((x) => l(x.name).toLowerCase() === nm.toLowerCase())) { toast('warning', 'Такой NPC уже есть'); return; }
            m.npcs.push({ id: uid(), name: nm, g: '', app: '', cloth: '', alias: '', neg: '' });
            saveMeta(); refreshAll();
        });
        // пресеты
        on('change', '[data-ed]', function () { const s = S(); if (!s.edit) s.edit = {}; s.edit[this.dataset.ed] = this.value; save(); refreshAll(); });
        on('change', '[data-edkind]', function () {
            const s = S(); const lb = lib();
            const p = libFind(lb.prompts, s.edit ? s.edit.tpl : null); if (!p) return;
            p.kind = KINDS.indexOf(this.value) >= 0 ? this.value : 'custom';
            saveLib(); refreshAll();
        });
        const presetArr = (edId) => edId === 'tpl' ? lib().prompts : edId === 'sty' ? lib().styles : lib().negs;
        const textField = (kind) => kind === 'style' ? 'tags' : 'text';
        on('click', '[data-preset-save]', function () {
            const edId = this.dataset.presetSave, kind = this.dataset.kind;
            const s = S(); const arr = presetArr(edId);
            const cur = libFind(arr, s.edit ? s.edit[edId] : null) || arr[0];
            if (!cur) return;
            const nameEl = find1(`[data-edname="${edId}"]`), textEl = find1(`[data-edtext="${edId}"]`);
            cur.name = ((nameEl && nameEl.value) || '').trim().slice(0, 60) || cur.name;
            cur[textField(kind)] = (textEl && textEl.value) || '';
            saveLib(); toast('success', 'Сохранено'); refreshAll();
        });
        on('click', '[data-preset-new]', function () {
            const edId = this.dataset.presetNew, kind = this.dataset.kind;
            const s = S(); const arr = presetArr(edId);
            const id = 'p_' + uid();
            const rec = { id, name: 'Новый', fam: provFamily(s) };
            if (kind === 'prompt') { rec.kind = 'custom'; rec.text = ''; rec.builtin = 0; }
            else { rec.tags = ''; rec.text = ''; rec.img = ''; }
            arr.push(rec);
            if (!s.edit) s.edit = {};
            s.edit[edId] = id;
            saveLib(); save(); refreshAll();
        });
        on('click', '[data-preset-dup]', function () {
            const edId = this.dataset.presetDup, kind = this.dataset.kind;
            const s = S(); const arr = presetArr(edId);
            const cur = libFind(arr, s.edit ? s.edit[edId] : null) || arr[0];
            if (!cur) return;
            const copy = deep(cur); copy.id = 'p_' + uid(); copy.name = (copy.name || '—') + ' · копия';
            arr.push(copy);
            if (!s.edit) s.edit = {};
            s.edit[edId] = copy.id;
            saveLib(); save(); refreshAll();
        });
        on('click', '[data-preset-del]', function () {
            const edId = this.dataset.presetDel, kind = this.dataset.kind;
            const s = S(); const arr = presetArr(edId);
            const cur = libFind(arr, s.edit ? s.edit[edId] : null) || arr[0];
            if (!cur) return;
            if (cur.builtin) { toast('warning', 'Встроенный пресет нельзя удалить — только править'); return; }
            if (!confirm('Удалить «' + (cur.name || cur.id) + '»?')) return;
            const i = arr.indexOf(cur); arr.splice(i, 1);
            if (!s.edit) s.edit = {};
            s.edit[edId] = arr[Math.max(0, i - 1)] ? arr[Math.max(0, i - 1)].id : '';
            saveLib(); save(); refreshAll();
        });
        // API
        on('change', '[data-c]', function () {
            const row = this.closest('.shk-conn');
            if (!row) return;
            const cn = findConn(row.dataset.cid); if (!cn) return;
            cn[this.dataset.c] = this.value; save();
        });
        on('click', '[data-conn-save]', function () { save(); toast('success', 'Подключение сохранено'); });
        on('click', '[data-conn-add]', function () {
            const s = S();
            const id = 'c_' + uid();
            s.api.list.push({ id, platform: 'openai', base: '', key: '', model: '', name: 'Подключение ' + (s.api.list.length + 1) });
            s.apiId = id;
            save(); refreshAll();
        });
        on('click', '[data-conn-del]', function () {
            const s = S(); const id = this.dataset.connDel;
            if (!confirm('Удалить подключение?')) return;
            s.api.list = s.api.list.filter((x) => x.id !== id);
            if (s.apiId === id) s.apiId = (s.api.list[0] || {}).id || '';
            save(); refreshAll();
        });
        on('click', '[data-conn-test]', async function () {
            const cn = findConn(this.dataset.connTest); if (!cn) return;
            this.textContent = 'Тест…';
            try {
                await llmCall(cn, cn.key, 'Reply with the single word: ok', 'Test. Reply with: ok', 10);
                toast('success', 'Подключение работает ✓');
            } catch (e) { toast('error', 'Тест не прошёл: ' + (e && e.message ? e.message : e)); }
            this.textContent = 'Тест';
        });
        on('click', '[data-check-nai]', async function () {
            const s = S();
            if (!s.naiToken) { toast('warning', 'Сначала введи токен NovelAI'); return; }
            this.textContent = 'Проверка…';
            try {
                const res = await fetchT('https://api.novelai.net/user/subscription', { headers: { Authorization: 'Bearer ' + s.naiToken, Accept: 'application/json' } }, 30000);
                const txt = await res.text();
                if (!res.ok) throw httpErr(res, txt, 'NovelAI');
                const j = jparse(txt) || {};
                const perks = j.perks || {};
                const anlas = (j.trainingStepsLeft !== undefined) ? (j.trainingStepsMax - j.trainingStepsLeft) + ' шагов' : '—';
                toast('success', 'Токен ок. Подписка: ' + (perks.tier || j.tier || '—') + ', Anlas: ' + anlas);
            } catch (e) { toast('error', 'Проверка не прошла: ' + (e && e.message ? e.message : e)); }
            this.textContent = 'Проверить NovelAI';
        });
    }

    // ---------------------------------------------------------------- автотриггер и события
    function onCharRendered(mesId) {
        const s = S();
        if (s.mode !== 'auto' || busy.size) return;
        const id = Number(mesId);
        const m = ctx().chat[id];
        if (!m || m.is_user || m.is_system) return;
        const sc = meta().scenes[String(id)];
        if (sc && sc.status === 'done') return;
        const marker = findMarker(m.mes || '');
        if (marker) { run(id); return; }
        if (s.writer === 'api') run(id, { rewrite: true });
    }
    let inited = false;
    function init() {
        bootLog('init: стартую');
        if (inited) return; inited = true;
        S(); refreshAll(); renderBars(); addToolbarButton();
        const cc = ctx(); const ev = cc.event_types || {};
        for (const name of ['USER_MESSAGE_RENDERED', 'MESSAGE_SWIPED', 'MESSAGE_UPDATED', 'MORE_MESSAGES_LOADED', 'MESSAGE_EDITED', 'MESSAGE_DELETED', 'GENERATION_ENDED', 'GENERATION_STOPPED', 'GENERATION_STARTED']) {
            if (ev[name]) cc.eventSource.on(ev[name], () => renderBars());
        }
        if (ev.CHARACTER_MESSAGE_RENDERED) cc.eventSource.on(ev.CHARACTER_MESSAGE_RENDERED, (mesId) => { onCharRendered(mesId); renderBars(); });
        if (ev.CHAT_CHANGED) cc.eventSource.on(ev.CHAT_CHANGED, () => { LIB = null; renderBars(); if (S().tab) refreshAll(); });
        if (ev.CHAT_COMPLETION_PROMPT_READY) cc.eventSource.on(ev.CHAT_COMPLETION_PROMPT_READY, inlineInjection);
        document.addEventListener('click', (e) => {
            const b = e.target.closest && e.target.closest('#chat .shk-b');
            if (!b) return;
            e.preventDefault(); e.stopPropagation();
            const mesEl = b.closest('.mes');
            const id = Number(mesEl && mesEl.getAttribute('mesid')); if (Number.isNaN(id)) return;
            barAction(id, b.dataset.act);
        });
        // запасной триггер авто-рисования, если события Таверны не приходят: следим за ростом чата
        try {
            let lastLen = (cc.chat || []).length;
            setInterval(() => {
                try {
                    const ch = ctx().chat || [];
                    if (ch.length !== lastLen) {
                        lastLen = ch.length;
                        renderBars();
                        if (ch.length && !ch[ch.length - 1].is_user && !ch[ch.length - 1].is_system) onCharRendered(ch.length - 1);
                    }
                } catch (e) { }
            }, 1500);
        } catch (e) { }
        bootLog('init: загружен ✔ кнопка 🦈 слева внизу');
        console.log('[sharky2] Sharky 2 v' + VER + ' загружен');
    }
    // старт: ждём, пока API SillyTavern реально станет доступен (до 30 c), потом init
    (function boot() {
        bootLog('жду API SillyTavern…');
        let tries = 0;
        const timer = setInterval(() => {
            tries++;
            if (ctxOk()) {
                clearInterval(timer);
                bootLog('API SillyTavern на месте');
                try {
                    const cc = ctx();
                    if (cc.event_types && cc.event_types.APP_READY && cc.eventSource) cc.eventSource.on(cc.event_types.APP_READY, () => { try { init(); } catch (e) { bootErr('init', e); } });
                } catch (e) { bootErr('старт', e); }
                try { if (!inited) init(); } catch (e) { bootErr('init', e); }
                if (!inited && tries < 20) return; // init отложен на APP_READY
                if (!inited) { try { init(); } catch (e) { bootErr('init', e); } }
            } else if (tries >= 60) {
                clearInterval(timer);
                bootErr('старт', new Error('SillyTavern API не появился за 30 секунд — расширение загружено до Таверны? Перезагрузи страницу'));
            }
        }, 500);
        // если через 5 c API так и не встал — всё равно попробуем init напрямую
        setTimeout(() => { if (!inited) { try { init(); } catch (e) { bootErr('init', e); } } }, 5000);
    })();

    // отладочный доступ для тестов (внешне ничего не меняет)
    if (typeof window !== 'undefined') {
        window.__sharkTest = { compose, parseMarker, findMarker, negFilter, applyGuards, wordKeys, mentions, genderFrom, stripConflicts, lookTags, unpackZip, memoFromTags, cleanLook, qTags, ucPreset, E, O, I, hasText, normTag, xmerge, w, cut, renderSettings, tabMain, tabLooks, tabPresets, tabApi, S, lib, activePrompt, activeStyle, activeNeg, collectLooks, storyContext, charsList, cardTexts, sceneOf, meta, naiGenerate, nsGenerate, proxyGenerate, llmCall, apiWrite };
    }
})();
