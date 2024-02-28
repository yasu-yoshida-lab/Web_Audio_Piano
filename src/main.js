﻿// 変数宣言
const keyMap = [
    { pcKey: "a", pianoKey: 0 },{ pcKey: "w", pianoKey: 1 },{ pcKey: "s", pianoKey: 2 },{ pcKey: "e", pianoKey: 3 },{ pcKey: "d", pianoKey: 4 },{ pcKey: "f", pianoKey: 5 },{ pcKey: "u", pianoKey: 6 },{ pcKey: "j", pianoKey: 7 },{ pcKey: "i", pianoKey: 8 },{ pcKey: "k", pianoKey: 9 },{ pcKey: "o", pianoKey: 10 },{ pcKey: "l", pianoKey: 11 },
]                                   // PCキーとピアノ鍵盤番号の紐づけ
const pianoSounds = []              // Audioオブジェクト        
const touchKeyNumlist = []          // タッチ中の鍵盤番号リスト
let clickedKeyNum = null            // クリック中の鍵盤番号リスト
const isKeyPressing = new Array(30) // ピアノ鍵盤ごとの押下状態
isKeyPressing.fill(false)           // 初期値 = false            
const intervalIds = new Array(30)   // 各オーディオフェードアウトのインターバルID
intervalIds.fill(null)              // 初期値 = null
const pianoWrap = document.getElementById("piano-wrap")     // 鍵盤全体
const whiteKeys = document.querySelectorAll(".white-key")   // 白鍵
const blackKeys = document.querySelectorAll(".black-key")   // 黒鍵
const audioctx = new AudioContext();
let oscillator = null;
let gain = null;


// タッチ対応判定
if (window.ontouchstart === null) {
    // タッチ対応：タッチイベントのリスナーをセット
    pianoWrap.addEventListener("touchstart", function(){ handleTouchEvents(event) })
    pianoWrap.addEventListener("touchmove", function(){ handleTouchEvents(event) })
    pianoWrap.addEventListener("touchend", function(){ handleTouchEvents(event) })
    pianoWrap.addEventListener("touchcancel", function(){ handleTouchEvents(event) }) 
} else {
    // タッチ非対応：マウスイベントのリスナーをセット
    pianoWrap.addEventListener("mousedown", function(){ handleMouseEvents(event) })
    pianoWrap.addEventListener("mouseup", function(){ handleMouseEvents(event) })
    window.addEventListener("mousemove", function(){ handleMouseEvents(event) })
} 

// 座標(x,y)に応じた鍵盤番号を取得
function getKeyNum(x, y){
    // 黒鍵とタッチ箇所が重なるかチェック
    for ( let j = 0; j < blackKeys.length; j++ ){
        const KeyRect = blackKeys[j].getBoundingClientRect()
        if ( x >= window.pageXOffset + KeyRect.left  &&
             x <= window.pageXOffset + KeyRect.right &&
             y >= window.pageYOffset + KeyRect.top   &&
             y <= window.pageYOffset + KeyRect.bottom ){
            // タッチした鍵盤番号をセット
            return Number( blackKeys[j].dataset.keyNum )
        }
    } 
    // 白鍵とタッチ箇所が重なるかチェック
    for ( let j = 0; j < whiteKeys.length; j++ ){
        const KeyRect = whiteKeys[j].getBoundingClientRect()
        if ( x >= window.pageXOffset + KeyRect.left  &&
             x <= window.pageXOffset + KeyRect.right &&
             y >= window.pageYOffset + KeyRect.top   &&
             y <= window.pageYOffset + KeyRect.bottom ){
            // タッチした鍵盤番号をセット
            return Number( whiteKeys[j].dataset.keyNum )
        }
    }
    // ピアノ外のタッチの場合
    return null
}

// タッチイベント発生時の処理
function handleTouchEvents(event){
    if (typeof event.cancelable !== 'boolean' || event.cancelable) {
        event.preventDefault();
    }
    const BeforeKeyNumlist = JSON.parse(JSON.stringify(touchKeyNumlist)) 
    touchKeyNumlist.length = 0
    // 各接触ポイントから押下中の鍵盤番号リストを作成
    for ( let i = 0; i < event.touches.length; i++ ){
        const x = event.touches[i].pageX 
        const y = event.touches[i].pageY 
        let keyNum = getKeyNum(x, y)
        if ( keyNum !== null ){
            if ( !touchKeyNumlist.includes(keyNum) ){
                // リストに存在しなければ鍵盤番号をセット
                touchKeyNumlist.push(keyNum)
            }
        }
    } 
    // 新リストのみに存在 => 鍵盤を押下した処理
    for ( let i = 0; i < touchKeyNumlist.length; i++ ){
        if ( !BeforeKeyNumlist.includes(touchKeyNumlist[i]) ){ 
            pressPianoKey(touchKeyNumlist[i]) 
        }
    }
    // 旧リストのみに存在 => 鍵盤をはなした処理
    for ( let i = 0; i < BeforeKeyNumlist.length; i++ ){
        if ( !touchKeyNumlist.includes(BeforeKeyNumlist[i]) ){
            releasePianoKey(BeforeKeyNumlist[i]) 
        }
    }
}

// マウスイベント発生時の処理
function handleMouseEvents(event){
    // 左クリック以外は対象外
    if ( event.which !== 1 ){ return }
    const x = event.pageX 
    const y = event.pageY 
    let keyNum
    switch ( event.type ){
        case "mousedown":
            keyNum = getKeyNum(x, y)
            if ( keyNum !== null ){ pressPianoKey(keyNum) }
            clickedKeyNum = keyNum
            break
        case "mouseup":
            if ( clickedKeyNum !== null ){
                keyNum = getKeyNum(x, y)
                if ( keyNum !== null ){ releasePianoKey(keyNum) }
                clickedKeyNum = null
            }
            break
        case "mousemove":
            keyNum = getKeyNum(x, y)
            if ( keyNum !== null ){
                // マウスポインタ位置が直前の鍵盤以外の鍵盤上の場合
                if ( keyNum !== clickedKeyNum ){ 
                    releasePianoKey(clickedKeyNum)
                    pressPianoKey(keyNum) 
                    clickedKeyNum = keyNum
                }
            } else {
                // マウスポインタ位置が鍵盤外の場合
                releasePianoKey(clickedKeyNum)
                clickedKeyNum = null
            }
            break
    }
}

// PCkeydown時の処理
document.onkeydown = function(event) {
    // 鍵盤番号を取得
    const obj = keyMap.find( (item) => item.pcKey === event.key )
    if ( typeof obj !== "undefined" ){
        // keyMapに含まれるキーの場合は後続処理実行
        pressPianoKey(obj.pianoKey)
    } 
}

// PCkeyup時の処理
document.onkeyup = function(event) {
    // 鍵盤番号を取得
    const obj = keyMap.find( (item) => item.pcKey === event.key )
    if ( typeof obj !== "undefined" ){
        // keyMapに含まれるキーの場合は後続処理実行
        releasePianoKey(obj.pianoKey)
    } 
}

// ピアノ鍵盤を押下した時の処理
function pressPianoKey(keyNum){
    if ( !isKeyPressing[keyNum] ){
        // 鍵盤を離している場合のみ続行(長押しによる連打防止)
        isKeyPressing[keyNum] = true
        document.querySelector(`[data-key-num="${keyNum}"]`).classList.add("pressing")
        soundPlay(keyNum)
    }
}

// ピアノ鍵盤をはなした時の処理
function releasePianoKey(keyNum){
    if ( isKeyPressing[keyNum] ){
        // 鍵盤を押している場合のみ続行
        isKeyPressing[keyNum] = false
        document.querySelector(`[data-key-num="${keyNum}"]`).classList.remove("pressing")
        soundStop(keyNum)
    }
}

// オーディオ再生
function soundPlay(soundNum){
    clearInterval( intervalIds[soundNum] )
    if(oscillator == null) {
        oscillator = audioctx.createOscillator();
        gain = new GainNode(audioctx);
        oscillator.type = "sine";
        gain.gain.volume = 0.5;
        oscillator.frequency.setValueAtTime(440, audioctx.currentTime);
        oscillator.connect(gain).connect(audioctx.destination);
        oscillator.start();
    }
}

// オーディオ停止(フェードアウト)
function soundStop(soundNum){  
    if (oscillator) { 
        gain.gain.exponentialRampToValueAtTime(0.001, audioctx.currentTime + 0.5);
        oscillator.stop(audioctx.currentTime + 0.5);
        oscillator = null;
    }
}