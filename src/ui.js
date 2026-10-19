import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture.js';
import { Button } from '@babylonjs/gui/2D/controls/button.js';
import { Control } from '@babylonjs/gui/2D/controls/control.js';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle.js';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock.js';
import { DEFAULT_ATTACHMENTS, WEAPON_DEFS } from './weapons.js';

const C = { acid: '#d6ed66', white: '#edf0e8', muted: '#a3ada2', dim: '#69736e', panel: '#0b1110', line: '#36413b', red: '#ef7057', green: '#94c675' };

function rect(name, width, height, background = 'transparent', alpha = 1) {
  const node = new Rectangle(name);
  node.width = width;
  node.height = height;
  node.background = background;
  node.alpha = alpha;
  node.thickness = 0;
  node.isPointerBlocker = false;
  return node;
}

function text(parent, name, value, size, color = C.white, { align = Control.HORIZONTAL_ALIGNMENT_LEFT, valign = Control.VERTICAL_ALIGNMENT_CENTER, font = 'Arial', weight = '400', spacing = 0 } = {}) {
  const node = new TextBlock(name, value);
  node.fontFamily = font;
  node.fontSize = size;
  node.fontWeight = weight;
  node.color = color;
  node.textHorizontalAlignment = align;
  node.textVerticalAlignment = valign;
  node.textWrapping = true;
  node.lineSpacing = 1.08;
  node.letterSpacing = spacing;
  parent.addControl(node);
  return node;
}

function panel(parent, name, width, height, background = '#0a100f', alpha = .88, radius = 3) {
  const node = rect(name, width, height, background, alpha);
  node.thickness = 1;
  node.color = C.line;
  node.cornerRadius = radius;
  parent.addControl(node);
  return node;
}

function label(parent, name, value, size, color, x, y, width, height, options = {}) {
  const node = text(parent, name, value, size, color, options);
  node.width = width;
  node.height = height;
  node.left = x;
  node.top = y;
  node.horizontalAlignment = options.halign ?? Control.HORIZONTAL_ALIGNMENT_LEFT;
  node.verticalAlignment = options.anchorY ?? Control.VERTICAL_ALIGNMENT_TOP;
  return node;
}

function actionButton(parent, name, title, callback, { width = '250px', height = '47px', accent = false, subtle = false } = {}) {
  const button = Button.CreateSimpleButton(name, title);
  button.width = width;
  button.height = height;
  button.thickness = 1;
  button.cornerRadius = 2;
  button.background = accent ? C.acid : subtle ? 'rgba(15,22,20,.5)' : '#17201c';
  button.color = accent ? '#10150f' : '#aeb9ae';
  button.fontFamily = 'Arial';
  button.fontSize = 12;
  button.fontWeight = '700';
  button.textBlock.letterSpacing = 1.4;
  button.isPointerBlocker = true;
  if (accent) button.color = '#10150f';
  button.onPointerEnterObservable.add(() => { if (!accent) button.background = '#222e27'; });
  button.onPointerOutObservable.add(() => { if (!accent) button.background = subtle ? 'rgba(15,22,20,.5)' : '#17201c'; });
  button.onPointerClickObservable.add(callback);
  parent.addControl(button);
  return button;
}

function addLayer(ui, name, background = 'transparent', alpha = 1) {
  const layer = rect(name, 1, 1, background, alpha);
  layer.width = '100%';
  layer.height = '100%';
  layer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  layer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  layer.isPointerBlocker = false;
  ui.addControl(layer);
  return layer;
}

export function createInterface(scene, actions, { mobile = false, settings, attachmentsByWeapon }) {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('MAX-FPS // BABYLON GUI', true, scene);
  ui.idealHeight = 900;
  ui.useSmallestIdeal = true;
  ui.renderScale = mobile ? 1 : 1.08;

  const hud = addLayer(ui, 'combat HUD');
  hud.isVisible = false;
  const topLeft = panel(hud, 'field identity', '280px', '58px', '#09100f', .79);
  topLeft.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  topLeft.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  topLeft.left = 22;
  topLeft.top = 20;
  const brand = label(topLeft, 'MAXFPS brand', 'MAX', 21, C.white, '14px', '4px', '45px', '30px', { font: 'Arial Narrow', weight: '900' });
  label(topLeft, 'brand slash', '/', 21, C.acid, '56px', '4px', '12px', '30px', { font: 'monospace', weight: '700' });
  label(topLeft, 'brand fps', 'FPS', 21, C.white, '68px', '4px', '42px', '30px', { font: 'Arial Narrow', weight: '900' });
  label(topLeft, 'deployment stamp', 'FIELD SYSTEMS  /  LIVE', 8, C.muted, '14px', '34px', '190px', '15px', { font: 'monospace', weight: '600', spacing: 1.25 });
  const badge = panel(topLeft, 'protocol badge', '68px', '24px', '#20291b', .9, 2);
  badge.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  badge.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  badge.left = '-10px';
  badge.top = '17px';
  badge.color = '#5a684a';
  label(badge, 'protocol code', 'P-07', 9, C.acid, '0px', '0px', '100%', '100%', { font: 'monospace', weight: '700', align: Control.HORIZONTAL_ALIGNMENT_CENTER, valign: Control.VERTICAL_ALIGNMENT_CENTER });

  const objectivePanel = panel(hud, 'objective card', '238px', '74px', '#09100f', .72);
  objectivePanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  objectivePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  objectivePanel.left = 22;
  objectivePanel.top = 91;
  label(objectivePanel, 'objective eyebrow', 'OBJECTIVE  /  LIVE FIRE', 8, C.acid, '12px', '8px', '210px', '14px', { font: 'monospace', weight: '700', spacing: .8 });
  const objectiveText = label(objectivePanel, 'objective text', 'Clear the hostile cell.', 11, C.white, '12px', '27px', '211px', '20px', { weight: '600' });
  const objectiveSub = label(objectivePanel, 'objective subtext', 'Confirm targets · stay operational', 8, C.muted, '12px', '49px', '212px', '14px', { font: 'monospace' });

  const wavePlate = panel(hud, 'wave counter', '90px', '54px', '#0a100e', .73);
  wavePlate.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  wavePlate.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  wavePlate.left = 22;
  wavePlate.top = 176;
  label(wavePlate, 'wave caption', 'WAVE', 8, C.muted, '10px', '6px', '68px', '13px', { font: 'monospace', weight: '700', spacing: .9 });
  const waveValue = label(wavePlate, 'wave value', '01', 22, C.white, '10px', '19px', '68px', '27px', { font: 'monospace', weight: '700' });

  const topRight = panel(hud, 'mission telemetry', '188px', '58px', '#09100f', .79);
  topRight.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  topRight.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  topRight.left = '-22px';
  topRight.top = '20px';
  label(topRight, 'telemetry caption', 'ELAPSED  /  HOSTILES', 8, C.muted, '11px', '7px', '166px', '14px', { font: 'monospace', weight: '600', spacing: .75 });
  const timeValue = label(topRight, 'time value', '00:00', 16, C.white, '11px', '26px', '76px', '23px', { font: 'monospace', weight: '700' });
  const killValue = label(topRight, 'kill value', '00 / 06', 10, C.acid, '100px', '29px', '76px', '20px', { font: 'monospace', weight: '700', align: Control.HORIZONTAL_ALIGNMENT_RIGHT });

  const centerStatus = panel(hud, 'center status tag', '176px', '28px', '#09100f', .55, 2);
  centerStatus.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  centerStatus.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  centerStatus.top = '20px';
  const centerStatusText = label(centerStatus, 'center status text', 'BODYCAM  ·  REC', 8, C.muted, '0px', '0px', '100%', '100%', { font: 'monospace', weight: '700', align: Control.HORIZONTAL_ALIGNMENT_CENTER, valign: Control.VERTICAL_ALIGNMENT_CENTER, spacing: 1.1 });
  const record = panel(centerStatus, 'record indicator', '6px', '6px', '#d65d47', 1, 5);
  record.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  record.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  record.left = '12px';

  const healthPanel = panel(hud, 'vital monitor', '210px', '78px', '#09100f', .8);
  healthPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  healthPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  healthPanel.left = '22px';
  healthPanel.top = '-22px';
  label(healthPanel, 'vital label', 'OPERATOR  /  STATUS', 8, C.muted, '12px', '7px', '180px', '13px', { font: 'monospace', weight: '700', spacing: .8 });
  const healthValue = label(healthPanel, 'health value', '100', 26, C.white, '12px', '22px', '55px', '31px', { font: 'monospace', weight: '700' });
  label(healthPanel, 'health percent', 'HP', 8, C.muted, '62px', '37px', '18px', '12px', { font: 'monospace', weight: '700' });
  const healthBarBg = rect('health bar background', '106px', '4px', '#27312c', 1);
  healthBarBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  healthBarBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  healthBarBg.left = '94px';
  healthBarBg.top = '37px';
  healthPanel.addControl(healthBarBg);
  const healthBar = rect('health bar', '100%', '100%', C.acid, 1);
  healthBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  healthBarBg.addControl(healthBar);
  const armorBarBg = rect('armour bar background', '106px', '3px', '#27312c', 1);
  armorBarBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  armorBarBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  armorBarBg.left = '94px';
  armorBarBg.top = '46px';
  healthPanel.addControl(armorBarBg);
  const armorBar = rect('armour bar', '100%', '100%', '#8da4a1', 1);
  armorBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  armorBarBg.addControl(armorBar);
  const armorValue = label(healthPanel, 'armour caption', 'PLATE  100', 8, C.muted, '94px', '52px', '106px', '13px', { font: 'monospace' });

  const weaponPanel = panel(hud, 'weapon identity strip', '228px', '54px', '#09100f', .76);
  weaponPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  weaponPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  weaponPanel.top = '-24px';
  const weaponName = label(weaponPanel, 'weapon name', 'AR-17 CARBINE', 11, C.white, '12px', '7px', '202px', '18px', { font: 'monospace', weight: '700', align: Control.HORIZONTAL_ALIGNMENT_CENTER });
  const weaponMeta = label(weaponPanel, 'weapon metadata', '5.56 × 45  /  AUTO', 8, C.muted, '10px', '30px', '208px', '13px', { font: 'monospace', align: Control.HORIZONTAL_ALIGNMENT_CENTER, spacing: .5 });

  const ammoPanel = panel(hud, 'ammunition monitor', '188px', '79px', '#09100f', .83);
  ammoPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  ammoPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  ammoPanel.left = '-22px';
  ammoPanel.top = '-22px';
  label(ammoPanel, 'ammo label', 'AMMUNITION  /  MAG', 8, C.muted, '11px', '7px', '166px', '13px', { font: 'monospace', weight: '700', spacing: .7 });
  const ammoValue = label(ammoPanel, 'ammo value', '30', 29, C.white, '11px', '23px', '73px', '38px', { font: 'monospace', weight: '700' });
  const ammoReserve = label(ammoPanel, 'reserve ammo', '/ 120', 12, C.muted, '84px', '38px', '84px', '21px', { font: 'monospace', weight: '600' });
  const fireMode = label(ammoPanel, 'fire mode', 'AUTO', 8, C.acid, '11px', '60px', '100px', '13px', { font: 'monospace', weight: '700', spacing: .8 });
  const reloadLabel = label(ammoPanel, 'reload status', '', 8, C.acid, '91px', '60px', '85px', '13px', { font: 'monospace', weight: '700', align: Control.HORIZONTAL_ALIGNMENT_RIGHT });

  const reticle = addLayer(ui, 'reticle');
  reticle.isVisible = false;
  reticle.isPointerBlocker = false;
  const crosshairPieces = [];
  const addCross = (name, width, height, x, y) => {
    const piece = rect(name, `${width}px`, `${height}px`, '#e9f0df', .9);
    piece.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    piece.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    piece.left = x;
    piece.top = y;
    piece.shadowBlur = 2;
    piece.shadowColor = '#000000';
    reticle.addControl(piece);
    crosshairPieces.push(piece);
    return piece;
  };
  const topTick = addCross('reticle top tick', 2, 8, 0, -11);
  const bottomTick = addCross('reticle bottom tick', 2, 8, 0, 11);
  const leftTick = addCross('reticle left tick', 8, 2, -11, 0);
  const rightTick = addCross('reticle right tick', 8, 2, 11, 0);
  const reticleDot = addCross('reticle center', 2, 2, 0, 0);
  const hitmarker = addLayer(ui, 'hit-confirmation');
  hitmarker.isVisible = false;
  const hitBars = [];
  for (const [x, y, rot] of [[-8, -8, 45], [8, -8, -45], [-8, 8, -45], [8, 8, 45]]) {
    const bar = rect('hit marker slash', '2px', '10px', C.acid, 1);
    bar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    bar.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    bar.left = x;
    bar.top = y;
    bar.rotation = rot * Math.PI / 180;
    hitmarker.addControl(bar);
    hitBars.push(bar);
  }

  const touchLayer = addLayer(ui, 'touch combat controls');
  touchLayer.isVisible = false;
  touchLayer.isPointerBlocker = false;
  const movePad = rect('virtual movement pad', '146px', '146px', 'rgba(10,16,14,.28)', .9);
  movePad.thickness = 1;
  movePad.color = 'rgba(233,240,225,.3)';
  movePad.cornerRadius = 80;
  movePad.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  movePad.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  movePad.left = '20px';
  movePad.top = '-32px';
  movePad.isPointerBlocker = true;
  touchLayer.addControl(movePad);
  const padGuide = rect('movement guide ring', '61px', '61px', 'transparent', 1);
  padGuide.thickness = 1;
  padGuide.color = 'rgba(233,240,225,.16)';
  padGuide.cornerRadius = 40;
  padGuide.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  padGuide.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  movePad.addControl(padGuide);
  const moveKnob = rect('movement knob', '54px', '54px', 'rgba(146,171,78,.24)', 1);
  moveKnob.thickness = 1;
  moveKnob.color = 'rgba(214,237,102,.84)';
  moveKnob.cornerRadius = 35;
  moveKnob.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  moveKnob.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  moveKnob.shadowBlur = 13;
  moveKnob.shadowColor = 'rgba(214,237,102,.3)';
  movePad.addControl(moveKnob);
  const moveCaption = text(touchLayer, 'movement caption', 'MOVE', 7, 'rgba(238,241,229,.52)', { align: Control.HORIZONTAL_ALIGNMENT_CENTER, font: 'monospace', weight: '700', spacing: 1.3 });
  moveCaption.width = '70px'; moveCaption.height = '13px';
  moveCaption.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  moveCaption.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  moveCaption.left = '58px'; moveCaption.top = '-13px';
  const touchButton = (name, value, width, height, halign, valign, x, y, handler, { fire = false, toggle = false } = {}) => {
    const button = Button.CreateSimpleButton(name, value);
    button.width = `${width}px`; button.height = `${height}px`;
    button.thickness = 1;
    button.cornerRadius = fire ? 100 : Math.min(width, height) / 2;
    button.background = fire ? 'rgba(18,27,18,.9)' : 'rgba(8,13,12,.74)';
    button.color = fire ? C.acid : '#e6eadf';
    button.fontFamily = 'monospace';
    button.fontSize = fire ? 10 : 8;
    button.fontWeight = '700';
    button.textBlock.letterSpacing = .7;
    button.textBlock.lineSpacing = .88;
    button.isPointerBlocker = true;
    button.horizontalAlignment = halign;
    button.verticalAlignment = valign;
    button.left = x;
    button.top = y;
    if (fire) {
      button.color = C.acid;
      button.background = 'rgba(16,24,17,.9)';
      button.thickness = 1.5;
      button.shadowBlur = 14;
      button.shadowColor = 'rgba(214,237,102,.22)';
      button.onPointerDownObservable.add(() => { button.background = 'rgba(79,97,37,.78)'; actions.fireDown?.(); });
      button.onPointerUpObservable.add(() => { button.background = 'rgba(16,24,17,.9)'; actions.fireUp?.(); });
      button.onPointerOutObservable.add(() => { button.background = 'rgba(16,24,17,.9)'; actions.fireUp?.(); });
    } else if (toggle) {
      button.onPointerClickObservable.add(handler);
    } else {
      button.onPointerClickObservable.add(handler);
    }
    touchLayer.addControl(button);
    return button;
  };
  const sprintTouch = touchButton('touch sprint', 'RUN', 47, 27, Control.HORIZONTAL_ALIGNMENT_LEFT, Control.VERTICAL_ALIGNMENT_BOTTOM, '24px', '-190px', actions.toggleSprint);
  const crouchTouch = touchButton('touch crouch', 'LOW', 47, 27, Control.HORIZONTAL_ALIGNMENT_LEFT, Control.VERTICAL_ALIGNMENT_BOTTOM, '78px', '-190px', actions.toggleCrouch);
  const fragTouch = touchButton('touch grenade', '◇\nFRAG', 51, 51, Control.HORIZONTAL_ALIGNMENT_RIGHT, Control.VERTICAL_ALIGNMENT_BOTTOM, '-151px', '-34px', actions.throwGrenade);
  const swapTouch = touchButton('touch swap weapon', '⇄\nSWAP', 51, 51, Control.HORIZONTAL_ALIGNMENT_RIGHT, Control.VERTICAL_ALIGNMENT_BOTTOM, '-151px', '-94px', actions.swapWeapon);
  const adsTouch = touchButton('touch aim', '◎\nADS', 58, 58, Control.HORIZONTAL_ALIGNMENT_RIGHT, Control.VERTICAL_ALIGNMENT_BOTTOM, '-87px', '-54px', actions.toggleAim, { toggle: true });
  const reloadTouch = touchButton('touch reload', '↻\nLOAD', 51, 51, Control.HORIZONTAL_ALIGNMENT_RIGHT, Control.VERTICAL_ALIGNMENT_BOTTOM, '-23px', '-94px', actions.reload);
  const lightTouch = touchButton('touch light', '⌁\nLIGHT', 51, 51, Control.HORIZONTAL_ALIGNMENT_RIGHT, Control.VERTICAL_ALIGNMENT_BOTTOM, '-23px', '-34px', actions.toggleLight, { toggle: true });
  const pauseTouch = touchButton('touch pause', 'Ⅱ\nMENU', 46, 46, Control.HORIZONTAL_ALIGNMENT_RIGHT, Control.VERTICAL_ALIGNMENT_TOP, '-16px', '16px', actions.pause);
  const fireTouch = touchButton('touch fire', 'FIRE\nHOLD', 83, 83, Control.HORIZONTAL_ALIGNMENT_RIGHT, Control.VERTICAL_ALIGNMENT_BOTTOM, '-28px', '-160px', null, { fire: true });
  const lookCaption = text(touchLayer, 'look instruction', 'DRAG TO LOOK', 7, 'rgba(239,243,233,.25)', { align: Control.HORIZONTAL_ALIGNMENT_CENTER, font: 'monospace', weight: '500', spacing: 1.1 });
  lookCaption.width = '120px'; lookCaption.height = '14px';
  lookCaption.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  lookCaption.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  lookCaption.left = '22%'; lookCaption.top = '17%';

  function updateJoystick(point) {
    const radius = Math.max(1, movePad.widthInPixels * .34);
    let dx = point.x - movePad.centerX;
    let dy = point.y - movePad.centerY;
    const length = Math.hypot(dx, dy);
    if (length > radius) { dx *= radius / length; dy *= radius / length; }
    moveKnob.left = dx;
    moveKnob.top = dy;
    actions.joystickMove?.(dx / radius, -dy / radius);
  }
  movePad.onPointerDownObservable.add((point) => { actions.joystickStart?.(); updateJoystick(point); });
  movePad.onPointerMoveObservable.add((point) => updateJoystick(point));
  movePad.onPointerUpObservable.add(() => {
    moveKnob.left = 0; moveKnob.top = 0;
    actions.joystickEnd?.();
  });

  const banner = panel(hud, 'combat announcement', '360px', '68px', '#0a100e', .88, 3);
  banner.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  banner.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  banner.top = '-100px';
  banner.isVisible = false;
  const bannerTitle = label(banner, 'announcement title', 'WAVE SECURED', 17, C.acid, '0px', '9px', '100%', '25px', { font: 'Arial Narrow', weight: '800', align: Control.HORIZONTAL_ALIGNMENT_CENTER, valign: Control.VERTICAL_ALIGNMENT_CENTER, spacing: 1.2 });
  const bannerSub = label(banner, 'announcement detail', 'AREA CLEAR  /  RELOAD AND REPOSITION', 8, C.muted, '0px', '38px', '100%', '15px', { font: 'monospace', align: Control.HORIZONTAL_ALIGNMENT_CENTER, valign: Control.VERTICAL_ALIGNMENT_CENTER, spacing: .7 });
  const toast = text(hud, 'toast notice', '', 9, C.acid, { align: Control.HORIZONTAL_ALIGNMENT_CENTER, font: 'monospace', weight: '700', spacing: .6 });
  toast.width = '300px';
  toast.height = '21px';
  toast.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  toast.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  toast.top = '-100px';
  const helpText = text(hud, 'desktop control legend', 'WASD MOVE     RMB AIM     R RELOAD     Q FRAG     1—8 SELECT', 8, 'rgba(224,231,220,.46)', { align: Control.HORIZONTAL_ALIGNMENT_CENTER, font: 'monospace', weight: '500', spacing: .65 });
  helpText.width = '420px';
  helpText.height = '15px';
  helpText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  helpText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  helpText.top = '-4px';

  const menuLayer = addLayer(ui, 'main menu');
  const menuVeil = rect('menu scrim', '100%', '100%', '#080d0c', .73);
  menuLayer.addControl(menuVeil);
  const menuRule = rect('menu accent rule', '4px', '296px', C.acid, .95);
  menuRule.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  menuRule.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  menuRule.left = '8%';
  menuRule.top = '19%';
  menuLayer.addControl(menuRule);
  const menuBrand = label(menuLayer, 'menu brand', 'MAX / FPS     ·     FIELD SYSTEMS', 10, C.acid, '9.5%', '18%', '480px', '22px', { font: 'monospace', weight: '700', spacing: 1.5 });
  const menuEyebrow = label(menuLayer, 'menu eyebrow', 'TACTICAL RESPONSE SIMULATION  /  07', 9, C.muted, '9.5%', '24%', '480px', '20px', { font: 'monospace', weight: '600', spacing: 1.15 });
  const title = label(menuLayer, 'operation title', 'IRON QUIET', 62, C.white, '9.2%', '28%', '630px', '91px', { font: 'Arial Narrow', weight: '900', spacing: 1.8 });
  label(menuLayer, 'operation subtitle', 'WAREHOUSE LIVE-FIRE  /  SECTOR 04', 11, '#c0c9bd', '9.5%', '39%', '530px', '22px', { font: 'monospace', weight: '600', spacing: 1.2 });
  label(menuLayer, 'menu briefing', 'A hostile cell has seized the freight depot.\nClear each wave. Keep your plate intact.', 13, '#929d93', '9.5%', '45%', '390px', '51px', { weight: '400' });
  const menuRule2 = rect('menu separator', '382px', '1px', '#526052', .53);
  menuRule2.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  menuRule2.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  menuRule2.left = '9.5%';
  menuRule2.top = '54%';
  menuLayer.addControl(menuRule2);
  const startButton = actionButton(menuLayer, 'start deployment', '▶   DEPLOY TO SECTOR', actions.startGame, { width: '254px', height: '48px', accent: true });
  startButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  startButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  startButton.left = '9.5%';
  startButton.top = '57%';
  const armoryButton = actionButton(menuLayer, 'open armory', 'OPEN ARMORY  →', () => openArmory('menu'), { width: '254px', height: '42px', subtle: true });
  armoryButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  armoryButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  armoryButton.left = '9.5%';
  armoryButton.top = '64%';
  const settingsButton = actionButton(menuLayer, 'open settings', 'SYSTEM SETTINGS', () => openSettings('menu'), { width: '254px', height: '38px', subtle: true });
  settingsButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  settingsButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  settingsButton.left = '9.5%';
  settingsButton.top = '71%';
  label(menuLayer, 'menu edition', 'BUILD  0.7.4   /   WEBGL 2   /   BABYLON', 8, '#626c65', '9.5%', '88%', '470px', '18px', { font: 'monospace', weight: '500', spacing: .8 });
  const sideReadout = panel(menuLayer, 'sector metadata', '210px', '96px', '#101714', .7);
  sideReadout.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  sideReadout.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  sideReadout.left = '-7%';
  sideReadout.top = '-11%';
  label(sideReadout, 'sector readout title', 'SECTOR 04', 10, C.acid, '13px', '11px', '180px', '18px', { font: 'monospace', weight: '700', spacing: 1 });
  label(sideReadout, 'sector readout body', 'CLEARANCE  /  RESTRICTED\nHOSTILES   /  UNKNOWN\nWEATHER    /  DRY', 8, C.muted, '13px', '37px', '185px', '48px', { font: 'monospace' });

  const pauseLayer = addLayer(ui, 'pause menu', '#050908', .82);
  pauseLayer.isVisible = false;
  const pausePanel = panel(pauseLayer, 'pause panel', '390px', '360px', '#0b1110', .97, 4);
  pausePanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  pausePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  label(pausePanel, 'pause eyebrow', 'FIELD SYSTEMS  /  SESSION HELD', 9, C.acid, '26px', '27px', '330px', '18px', { font: 'monospace', weight: '700', spacing: 1 });
  label(pausePanel, 'pause heading', 'PAUSED', 34, C.white, '26px', '58px', '340px', '51px', { font: 'Arial Narrow', weight: '900', spacing: 1.4 });
  label(pausePanel, 'pause description', 'Your operator remains in sector.\nResume when you are ready.', 11, C.muted, '26px', '114px', '330px', '42px');
  const resumeButton = actionButton(pausePanel, 'resume field', 'RESUME DEPLOYMENT', actions.resumeGame, { width: '338px', height: '44px', accent: true });
  resumeButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; resumeButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; resumeButton.left = '26px'; resumeButton.top = '176px';
  const pauseArmory = actionButton(pausePanel, 'pause armory', 'ARMORY / LOADOUT', () => openArmory('pause'), { width: '164px', height: '40px', subtle: true });
  pauseArmory.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; pauseArmory.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; pauseArmory.left = '26px'; pauseArmory.top = '231px';
  const pauseSettings = actionButton(pausePanel, 'pause settings', 'SETTINGS', () => openSettings('pause'), { width: '164px', height: '40px', subtle: true });
  pauseSettings.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; pauseSettings.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; pauseSettings.left = '200px'; pauseSettings.top = '231px';
  const quitButton = actionButton(pausePanel, 'end deployment', 'END DEPLOYMENT', actions.toMenu, { width: '338px', height: '36px', subtle: true });
  quitButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; quitButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; quitButton.left = '26px'; quitButton.top = '287px';

  const debriefLayer = addLayer(ui, 'debrief screen', '#050908', .86);
  debriefLayer.isVisible = false;
  const debriefPanel = panel(debriefLayer, 'debrief card', '430px', '375px', '#0b1110', .97, 4);
  debriefPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  debriefPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  label(debriefPanel, 'debrief eyebrow', 'OPERATOR DOWN  /  MISSION ENDED', 9, C.red, '28px', '26px', '370px', '17px', { font: 'monospace', weight: '700', spacing: .8 });
  label(debriefPanel, 'debrief title', 'AFTER ACTION', 29, C.white, '28px', '56px', '370px', '45px', { font: 'Arial Narrow', weight: '900', spacing: 1.2 });
  const debriefStats = label(debriefPanel, 'debrief stats', '00:00  /  00 CONFIRMED  /  WAVE 01', 10, C.acid, '28px', '113px', '370px', '24px', { font: 'monospace', weight: '700' });
  label(debriefPanel, 'debrief text', 'The sector remains contested.\nRe-equip and redeploy when ready.', 11, C.muted, '28px', '154px', '370px', '42px');
  const debriefRetry = actionButton(debriefPanel, 'redeploy', 'REDEPLOY', actions.startGame, { width: '370px', height: '44px', accent: true });
  debriefRetry.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; debriefRetry.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; debriefRetry.left = '28px'; debriefRetry.top = '218px';
  const debriefMenu = actionButton(debriefPanel, 'debrief to menu', 'RETURN TO TITLE', actions.toMenu, { width: '370px', height: '40px', subtle: true });
  debriefMenu.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; debriefMenu.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; debriefMenu.left = '28px'; debriefMenu.top = '274px';

  let armoryLayer = null;
  let settingLayer = null;
  let armoryCard = null;
  let armoryListPanel = null;
  let armoryDetailPanel = null;
  let armoryAttachmentButtons = {};
  let settingCard = null;
  let settingRows = [];
  let settingNote = null;
  let settingBackButton = null;
  let settingApplyButton = null;
  let returnFromSub = 'menu';
  let activeLayer = 'menu';
  let selectedWeapon = 0;
  let armoryInfo = null;
  const attachmentChoices = {
    optic: ['reflex', '2x', 'iron'],
    muzzle: ['standard', 'suppressor', 'compensator'],
    grip: ['vertical', 'laser', 'none'],
  };
  const friendlyName = { reflex: 'REFLEX / 1×', '2x': 'COMBAT / 2×', iron: 'IRON SIGHTS', standard: 'STANDARD', suppressor: 'SUPPRESSOR', compensator: 'COMPENSATOR', vertical: 'VERTICAL GRIP', laser: 'LASER / GRIP', none: 'NO UNDERBARREL' };

  function showLayer(name) {
    activeLayer = name;
    menuLayer.isVisible = name === 'menu';
    pauseLayer.isVisible = name === 'pause';
    debriefLayer.isVisible = name === 'debrief';
    hud.isVisible = name === 'playing';
    reticle.isVisible = name === 'playing';
    touchLayer.isVisible = mobile && name === 'playing';
    if (armoryLayer) armoryLayer.isVisible = name === 'armory';
    if (settingLayer) settingLayer.isVisible = name === 'settings';
    if (name === 'playing') {
      reticle.isVisible = true;
    }
    if (name === 'menu' || name === 'pause' || name === 'debrief') {
      if (name !== 'debrief') banner.isVisible = false;
    }
  }

  function updateArmoryInfo() {
    if (!armoryInfo) return;
    const def = WEAPON_DEFS[selectedWeapon];
    const attachment = attachmentsByWeapon[def.id] || (attachmentsByWeapon[def.id] = { ...DEFAULT_ATTACHMENTS });
    armoryInfo.name.text = def.name;
    armoryInfo.role.text = `${def.role}   /   ${def.caliber}`;
    armoryInfo.mode.text = `${def.mode}  ·  ${def.magazine} + ${def.reserve}  ·  ${def.damage} DMG`;
    armoryInfo.description.text = def.desc;
    for (const key of Object.keys(attachmentChoices)) armoryInfo.attachmentValues[key].text = friendlyName[attachment[key]] || attachment[key].toUpperCase();
    armoryInfo.weaponButtons.forEach((button, i) => {
      const active = i === selectedWeapon;
      button.background = active ? '#333e2a' : '#101714';
      button.color = active ? C.acid : '#a2aaa0';
    });
  }

  function openArmory(from) {
    returnFromSub = from;
    if (!armoryLayer) {
      armoryLayer = addLayer(ui, 'armory screen', '#050908', .92);
      const card = panel(armoryLayer, 'armory shell', '820px', '620px', '#0a100f', .98, 4);
      armoryCard = card;
      card.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      card.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      label(card, 'armory eyebrow', 'FIELD SYSTEMS  /  WEAPON CONTROL', 9, C.acid, '28px', '20px', '600px', '17px', { font: 'monospace', weight: '700', spacing: 1 });
      label(card, 'armory heading', 'ARMORY', 34, C.white, '28px', '43px', '360px', '48px', { font: 'Arial Narrow', weight: '900', spacing: 1.2 });
      const listPanel = panel(card, 'weapon list panel', '228px', '438px', '#0e1512', .9);
      armoryListPanel = listPanel;
      listPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; listPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; listPanel.left = '27px'; listPanel.top = '110px';
      label(listPanel, 'loadout list label', 'SELECT WEAPON', 8, C.muted, '11px', '11px', '204px', '15px', { font: 'monospace', weight: '700', spacing: .7 });
      const weaponButtons = [];
      WEAPON_DEFS.forEach((def, i) => {
        const button = actionButton(listPanel, `select ${def.id}`, `${String(i + 1).padStart(2, '0')}   ${def.short}`, () => { selectedWeapon = i; updateArmoryInfo(); }, { width: '205px', height: '40px', subtle: true });
        button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        button.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        button.left = '10px';
        button.top = `${38 + i * 47}px`;
        button.fontSize = 9;
        button.textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        button.textBlock.paddingLeft = '10px';
        button.textBlock.letterSpacing = .5;
        weaponButtons.push(button);
      });
      const detailPanel = panel(card, 'weapon detail panel', '510px', '320px', '#0e1512', .9);
      armoryDetailPanel = detailPanel;
      detailPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT; detailPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; detailPanel.left = '-28px'; detailPanel.top = '110px';
      const name = label(detailPanel, 'selected weapon title', '', 24, C.white, '23px', '18px', '460px', '37px', { font: 'Arial Narrow', weight: '900', spacing: .8 });
      const role = label(detailPanel, 'selected weapon role', '', 9, C.acid, '24px', '58px', '460px', '18px', { font: 'monospace', weight: '700', spacing: .7 });
      const mode = label(detailPanel, 'selected weapon stats', '', 10, C.white, '24px', '91px', '460px', '20px', { font: 'monospace', weight: '600' });
      const description = label(detailPanel, 'selected weapon description', '', 9, C.muted, '24px', '120px', '460px', '17px', { font: 'monospace', weight: '500', spacing: .5 });
      const rule = rect('attachment rule', '460px', '1px', '#39443c', .8); rule.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; rule.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; rule.left = '24px'; rule.top = '154px'; detailPanel.addControl(rule);
      const attachmentValues = {};
      const attachRows = [['optic', 'OPTIC'], ['muzzle', 'MUZZLE'], ['grip', 'UNDERBARREL']];
      attachRows.forEach(([key, titleText], i) => {
        label(detailPanel, `${key} label`, titleText, 8, C.muted, '24px', `${171 + i * 44}px`, '118px', '17px', { font: 'monospace', weight: '700', spacing: .75 });
        const button = actionButton(detailPanel, `${key} cycle`, '', () => {
          const def = WEAPON_DEFS[selectedWeapon];
          const attachment = attachmentsByWeapon[def.id] || (attachmentsByWeapon[def.id] = { ...DEFAULT_ATTACHMENTS });
          const choices = attachmentChoices[key];
          const index = choices.indexOf(attachment[key]);
          attachment[key] = choices[(index + 1) % choices.length];
          actions.setAttachment?.(def.id, key, attachment[key]);
          updateArmoryInfo();
        }, { width: '273px', height: '31px', subtle: true });
        button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; button.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; button.left = '158px'; button.top = `${164 + i * 44}px`;
        button.textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; button.textBlock.paddingLeft = '11px'; button.fontSize = 8;
        attachmentValues[key] = button.textBlock;
        armoryAttachmentButtons[key] = button;
      });
      const deploy = actionButton(card, 'equip and deploy', 'EQUIP & DEPLOY', () => {
        actions.equipWeapon?.(selectedWeapon);
        if (returnFromSub === 'pause') showLayer('pause');
        else actions.startGame?.();
      }, { width: '238px', height: '44px', accent: true });
      deploy.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT; deploy.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM; deploy.left = '-28px'; deploy.top = '-24px';
      const back = actionButton(card, 'close armory', '←  BACK', () => showLayer(returnFromSub), { width: '130px', height: '42px', subtle: true });
      back.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; back.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM; back.left = '28px'; back.top = '-24px';
      armoryInfo = { name, role, mode, description, weaponButtons, attachmentValues };
    }
    selectedWeapon = actions.getWeaponIndex?.() ?? selectedWeapon;
    armoryLayer.isVisible = true;
    showLayer('armory');
    updateArmoryInfo();
    resize();
  }

  function openSettings(from) {
    returnFromSub = from;
    if (!settingLayer) {
      settingLayer = addLayer(ui, 'settings screen', '#050908', .92);
      const card = panel(settingLayer, 'settings panel', '510px', '526px', '#0a100f', .98, 4);
      settingCard = card;
      card.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER; card.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      label(card, 'settings eyebrow', 'FIELD SYSTEMS  /  DISPLAY & INPUT', 9, C.acid, '30px', '28px', '440px', '17px', { font: 'monospace', weight: '700', spacing: .8 });
      label(card, 'settings title', 'SETTINGS', 31, C.white, '30px', '55px', '430px', '46px', { font: 'Arial Narrow', weight: '900', spacing: 1.2 });
      const rows = [
        { key: 'sensitivity', title: 'LOOK SENSITIVITY', choices: ['LOW', 'STANDARD', 'HIGH'] },
        { key: 'fov', title: 'FIELD OF VIEW', choices: ['NARROW', 'STANDARD', 'WIDE'] },
        { key: 'quality', title: 'RENDER QUALITY', choices: ['SAVER', 'BALANCED', 'HIGH'] },
        { key: 'invertY', title: 'INVERT LOOK', choices: ['OFF', 'ON'] },
        { key: 'haptics', title: 'HAPTIC FEEDBACK', choices: ['OFF', 'ON'] },
      ];
      const settingButtons = {};
      rows.forEach((row, i) => {
        const y = 121 + i * 55;
        const rowLabel = label(card, `${row.key} label`, row.title, 9, C.muted, '30px', `${y}px`, '210px', '31px', { font: 'monospace', weight: '700', spacing: .5 });
        const button = actionButton(card, `${row.key} cycle`, '', () => {
          const list = row.choices;
          const current = settings[row.key];
          const idx = typeof current === 'boolean' ? (current ? 1 : 0) : Math.max(0, list.findIndex((v) => v.toLowerCase() === String(current).toLowerCase()));
          const value = list[(idx + 1) % list.length];
          settings[row.key] = typeof current === 'boolean' ? value === 'ON' : value.toLowerCase();
          actions.setSetting?.(row.key, settings[row.key]);
          button.textBlock.text = value;
        }, { width: '192px', height: '34px', subtle: true });
        button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT; button.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; button.left = '-30px'; button.top = `${y}px`;
        button.fontSize = 8;
        const current = settings[row.key];
        const chosen = typeof current === 'boolean' ? (current ? 'ON' : 'OFF') : row.choices.find((v) => v.toLowerCase() === String(current).toLowerCase()) || row.choices[1];
        button.textBlock.text = chosen;
        settingButtons[row.key] = button;
        settingRows.push({ rowLabel, button, y });
      });
      settingNote = label(card, 'settings note', 'Changes save automatically. Render scale applies now; shadow tier is set at launch.', 8, C.dim, '30px', '407px', '438px', '28px', { font: 'monospace' });
      const back = actionButton(card, 'settings back', '←  BACK', () => showLayer(returnFromSub), { width: '190px', height: '41px', subtle: true });
      settingBackButton = back;
      back.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; back.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM; back.left = '30px'; back.top = '-26px';
      const apply = actionButton(card, 'settings apply', 'APPLY & RETURN', () => {
        actions.applySettings?.();
        showLayer(returnFromSub);
      }, { width: '220px', height: '41px', accent: true });
      settingApplyButton = apply;
      apply.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT; apply.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM; apply.left = '-30px'; apply.top = '-26px';
    }
    settingLayer.isVisible = true;
    showLayer('settings');
    resize();
  }

  function show(screen) {
    if (screen === 'armory') return openArmory(returnFromSub);
    if (screen === 'settings') return openSettings(returnFromSub);
    showLayer(screen);
  }

  function resize() {
    const compact = mobile || window.innerWidth < 760;
    healthPanel.left = compact ? '14px' : '22px';
    healthPanel.top = compact ? '-230px' : '-22px';
    objectivePanel.left = compact ? '14px' : '22px';
    objectivePanel.top = compact ? '84px' : '91px';
    wavePlate.left = compact ? '14px' : '22px';
    wavePlate.top = compact ? '166px' : '176px';
    topLeft.left = compact ? '14px' : '22px';
    topLeft.top = compact ? '12px' : '20px';
    topRight.left = compact ? '-12px' : '-22px';
    topRight.top = compact ? '12px' : '20px';
    topRight.width = compact ? '154px' : '188px';
    centerStatus.top = compact ? '78px' : '20px';
    centerStatus.width = compact ? '142px' : '176px';
    healthPanel.width = compact ? '188px' : '210px';
    healthPanel.height = compact ? '68px' : '78px';
    weaponPanel.isVisible = !compact;
    weaponPanel.top = compact ? '-102px' : '-24px';
    ammoPanel.left = compact ? '-12px' : '-22px';
    ammoPanel.top = compact ? '-265px' : '-22px';
    ammoPanel.width = compact ? '164px' : '188px';
    ammoPanel.height = compact ? '72px' : '79px';
    helpText.isVisible = !mobile && window.innerWidth > 700;
    menuRule.height = window.innerHeight < 700 ? '240px' : '296px';
    title.fontSize = window.innerWidth < 600 ? 44 : 62;
    if (armoryCard) {
      const narrow = mobile || window.innerWidth < 560;
      armoryCard.width = narrow ? '94%' : '820px';
      armoryCard.height = window.innerHeight < 620 ? '94%' : narrow ? '91%' : '620px';
      armoryListPanel.width = narrow ? '140px' : '228px';
      armoryListPanel.left = narrow ? '12px' : '27px';
      armoryListPanel.top = narrow ? '100px' : '110px';
      armoryDetailPanel.width = narrow ? '250px' : '510px';
      armoryDetailPanel.left = narrow ? '-12px' : '-28px';
      armoryDetailPanel.top = narrow ? '100px' : '110px';
      armoryInfo.weaponButtons.forEach((button, i) => {
        button.width = narrow ? '122px' : '205px';
        button.height = narrow ? '35px' : '40px';
        button.left = narrow ? '7px' : '10px';
        button.top = narrow ? `${36 + i * 43}px` : `${38 + i * 47}px`;
        button.fontSize = narrow ? 8 : 9;
        button.textBlock.paddingLeft = narrow ? '6px' : '10px';
      });
      armoryInfo.name.left = narrow ? '14px' : '23px';
      armoryInfo.name.width = narrow ? '220px' : '460px';
      armoryInfo.name.fontSize = narrow ? 19 : 24;
      armoryInfo.role.left = narrow ? '14px' : '24px';
      armoryInfo.role.width = narrow ? '220px' : '460px';
      armoryInfo.mode.left = narrow ? '14px' : '24px';
      armoryInfo.mode.width = narrow ? '220px' : '460px';
      armoryInfo.mode.fontSize = narrow ? 8 : 10;
      armoryInfo.description.left = narrow ? '14px' : '24px';
      armoryInfo.description.width = narrow ? '220px' : '460px';
      armoryInfo.description.fontSize = narrow ? 8 : 9;
      for (const [key, button] of Object.entries(armoryAttachmentButtons)) {
        button.width = narrow ? '144px' : '273px';
        button.left = narrow ? '91px' : '158px';
        button.height = narrow ? '29px' : '31px';
        button.fontSize = narrow ? 7 : 8;
        button.textBlock.paddingLeft = narrow ? '7px' : '11px';
      }
      const deploy = armoryCard.getChildByName('equip and deploy');
      const back = armoryCard.getChildByName('close armory');
      if (deploy) { deploy.width = narrow ? '172px' : '238px'; deploy.left = narrow ? '-12px' : '-28px'; }
      if (back) { back.width = narrow ? '92px' : '130px'; back.left = narrow ? '12px' : '28px'; }
    }
    if (settingCard) {
      const narrow = mobile || window.innerWidth < 560;
      settingCard.width = narrow ? '94%' : '510px';
      settingCard.height = window.innerHeight < 620 ? '92%' : narrow ? '88%' : '526px';
      for (const { rowLabel, button } of settingRows) {
        rowLabel.left = narrow ? '20px' : '30px';
        rowLabel.width = narrow ? '142px' : '210px';
        rowLabel.fontSize = narrow ? 8 : 9;
        button.width = narrow ? '150px' : '192px';
        button.left = narrow ? '-20px' : '-30px';
      }
      if (settingNote) { settingNote.left = narrow ? '20px' : '30px'; settingNote.width = narrow ? '300px' : '438px'; settingNote.fontSize = narrow ? 7 : 8; }
      if (settingBackButton) { settingBackButton.width = narrow ? '132px' : '190px'; settingBackButton.left = narrow ? '20px' : '30px'; }
      if (settingApplyButton) { settingApplyButton.width = narrow ? '154px' : '220px'; settingApplyButton.left = narrow ? '-20px' : '-30px'; }
    }
  }
  window.addEventListener('resize', resize);
  resize();

  let lastState = {};
  let lastBannerId = null;
  let lastToastValue = null;
  let bannerTimer = 0;
  let toastTimer = 0;
  function update(state, dt = 0) {
    lastState = state;
    if (state.screen !== undefined) {
      hud.isVisible = state.screen === 'playing';
      reticle.isVisible = state.screen === 'playing';
      touchLayer.isVisible = mobile && state.screen === 'playing';
      if (state.screen !== 'playing') banner.isVisible = false;
    }
    if (state.screen === 'debrief') {
      debriefStats.text = `${formatClock(state.elapsed || 0)}  /  ${String(state.kills || 0).padStart(2, '0')} CONFIRMED  /  WAVE ${String(state.wave || 1).padStart(2, '0')}  /  ${String(state.score || 0).padStart(5, '0')} PTS`;
    }
    if (state.screen !== 'playing') return;
    const def = state.weapon || WEAPON_DEFS[0];
    const wave = Math.max(1, state.wave || 1);
    objectiveText.text = state.objective || 'Clear the hostile cell.';
    objectiveSub.text = state.objectiveSub || 'Confirm targets · stay operational';
    waveValue.text = String(wave).padStart(2, '0');
    timeValue.text = formatClock(state.elapsed || 0);
    killValue.text = `${String(state.waveKills ?? state.kills ?? 0).padStart(2, '0')} / ${String(state.waveTotal || 6).padStart(2, '0')}`;
    healthValue.text = String(Math.max(0, Math.ceil(state.health ?? 100))).padStart(3, '0');
    armorValue.text = `PLATE  ${String(Math.max(0, Math.ceil(state.armor ?? 100))).padStart(3, '0')}`;
    healthBar.width = `${Math.max(0, Math.min(1, (state.health ?? 100) / 100)) * 100}%`;
    healthBar.background = (state.health ?? 100) <= 30 ? C.red : C.acid;
    armorBar.width = `${Math.max(0, Math.min(1, (state.armor ?? 100) / 100)) * 100}%`;
    weaponName.text = state.weaponName || def.name;
    weaponMeta.text = `${def.caliber}  /  ${def.mode}`;
    ammoValue.text = String(state.mag ?? def.magazine).padStart(2, '0');
    ammoReserve.text = `/ ${String(state.reserve ?? def.reserve).padStart(3, '0')}`;
    fireMode.text = state.reloading ? 'RELOADING' : (state.aiming ? 'AIMING' : def.mode);
    reloadLabel.text = state.reloadHint || '';
    const reticleGap = state.aiming ? 7 : 11 + (state.moving ? 3 : 0) + (state.sprinting ? 5 : 0) + Math.round((state.recoil || 0) * 5);
    topTick.height = bottomTick.height = state.aiming ? '5px' : '8px';
    leftTick.width = rightTick.width = state.aiming ? '5px' : '8px';
    topTick.top = `${-reticleGap}px`; bottomTick.top = `${reticleGap}px`;
    leftTick.left = `${-reticleGap}px`; rightTick.left = `${reticleGap}px`;
    reticleDot.background = state.aiming ? C.acid : '#e9f0df';
    reticle.isVisible = state.screen === 'playing' && !state.menuOpen;
    hitmarker.isVisible = (state.hitmarker || 0) > 0;
    if (state.banner && state.banner.id !== lastBannerId) {
      lastBannerId = state.banner.id;
      bannerTitle.text = state.banner.title;
      bannerSub.text = state.banner.sub || '';
      banner.isVisible = true;
      bannerTimer = state.banner.duration || 1.6;
    }
    if (bannerTimer > 0) {
      bannerTimer = Math.max(0, bannerTimer - dt);
      if (bannerTimer === 0) banner.isVisible = false;
    }
    if (state.toast && state.toast !== lastToastValue) {
      lastToastValue = state.toast;
      toast.text = state.toast;
      toast.alpha = 1;
      toastTimer = 1.2;
    }
    if (toastTimer > 0) {
      toastTimer = Math.max(0, toastTimer - dt);
      toast.alpha = Math.min(1, toastTimer * 2);
    }
    centerStatusText.text = state.sprinting ? 'BODYCAM  ·  MOVING' : 'BODYCAM  ·  REC';
    centerStatusText.color = state.sprinting ? C.acid : C.muted;
  }

  function showBanner(titleText, subText, duration = 1.8) {
    bannerTitle.text = titleText;
    bannerSub.text = subText || '';
    bannerTimer = duration;
    banner.isVisible = true;
  }
  function showToast(message) {
    toast.text = message;
    toast.alpha = 1;
    toastTimer = 1.35;
  }
  function setScreen(screen) {
    showLayer(screen);
    if (screen === 'playing') { hud.isVisible = true; reticle.isVisible = true; touchLayer.isVisible = mobile; }
    else { reticle.isVisible = false; touchLayer.isVisible = false; }
  }
  function closeSub() { showLayer(returnFromSub); }
  function setTouchState({ sprinting = false, crouched = false, aiming = false, lightOn = false } = {}) {
    sprintTouch.background = sprinting ? 'rgba(87,108,38,.8)' : 'rgba(8,13,12,.74)';
    crouchTouch.background = crouched ? 'rgba(87,108,38,.8)' : 'rgba(8,13,12,.74)';
    adsTouch.background = aiming ? 'rgba(87,108,38,.8)' : 'rgba(8,13,12,.74)';
    lightTouch.background = lightOn ? 'rgba(87,108,38,.8)' : 'rgba(8,13,12,.74)';
  }

  return { ui, update, show, setScreen, setTouchState, showBanner, showToast, openArmory, openSettings, closeSub, get activeLayer() { return activeLayer; }, get screen() { return lastState.screen; } };
}

function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
