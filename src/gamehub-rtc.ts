// @ts-nocheck
// GameHub official optional WebRTC SDK, retrieved 2026-09-15.
// Local extension: unorderedState allows application-level fragment reassembly.
(function (root) {
  "use strict";

  // Optional mesh transport. Room membership remains authoritative on WebSocket.
  class GameHubRTC {
    constructor(room, options = {}) {
      this.room = room;
      this.options = options;
      this.peers = new Map();
      this.handlers = new Map();
      this.closed = false;
      this.active = false;
      this.generation = 0;
      this.queue = Promise.resolve();
      this.unsubscribers = [
        room.subscribe("welcome", () => { this.active = true; this._sync(); }),
        room.subscribe("member_joined", () => this._sync()),
        room.subscribe("member_left", (m) => this._drop(m.member.client_id)),
        room.subscribe("signal", (m) => {
          const generation = this.generation;
          this.queue = this.queue.then(() => {
            if (generation === this.generation) return this._signal(m);
          }).catch((error) => this._emit("error", { peerId: m.from, error }));
        }),
        ...["leaving", "left", "close"].map((event) => room.subscribe(event, () => this._clear()))
      ];
    }

    static async attach(room, options = {}) {
      if (!root.RTCPeerConnection) throw new Error("浏览器不支持 WebRTC");
      const rtc = new GameHubRTC(room, options);
      try {
        rtc.config = await rtc._config();
        rtc.active = !!room.you;
        rtc._sync();
        return rtc;
      } catch (error) {
        rtc.close();
        throw error;
      }
    }

    on(event, fn) {
      this.handlers.set(event, fn);
      return this;
    }

    _emit(event, value) {
      this.handlers.get(event)?.(value);
    }

    async _config() {
      const config = this.options.iceServers !== undefined
        ? { iceServers: this.options.iceServers }
        : await this.room.iceConfig();
      if (this.options.iceTransportPolicy === "relay" &&
          !config.iceServers.some((s) => [].concat(s.urls).some((url) => /^turns?:/.test(url)))) {
        throw new Error("强制中转需要配置 TURN");
      }
      return { iceServers: config.iceServers, iceTransportPolicy: this.options.iceTransportPolicy || "all" };
    }

    _member(id) {
      return !this.closed && this.active && this.room.you &&
        id !== this.room.you.client_id && this.room.room?.members.some((m) => m.client_id === id);
    }

    _initiator(id) {
      return this.room.you.client_id < id;
    }

    _sync() {
      if (!this.config || !this.active || this.closed) return;
      for (const member of this.room.room?.members || []) {
        const id = member.client_id;
        if (this._member(id) && this._initiator(id) && !this.peers.has(id)) this._offer(id, 0);
      }
    }

    _current(peer) {
      return this.peers.get(peer.id) === peer && this._member(peer.id);
    }

    _create(id, connectionId, attempt) {
      this._drop(id);
      const pc = new root.RTCPeerConnection(this.config);
      const peer = { id, connectionId, attempt, pc, channels: {}, pending: [],
        descriptionSent: false, ready: false, tx: 0, rx: -1 };
      this.peers.set(id, peer);
      peer.timer = setTimeout(() => this._fail(peer, new Error("WebRTC 连接超时")), 20000);
      pc.onicecandidate = ({ candidate }) => {
        if (!candidate || !this._current(peer)) return;
        const message = { type: "candidate", candidate: candidate.toJSON() };
        if (peer.descriptionSent) this._sendSignal(peer, message);
        else peer.pending.push(message);
      };
      pc.ondatachannel = ({ channel }) => this._channel(peer, channel);
      pc.onconnectionstatechange = () => {
        if (!this._current(peer)) return;
        if (pc.connectionState === "failed") this._fail(peer, new Error("WebRTC 连接失败"));
        if (pc.connectionState === "disconnected" && !peer.disconnectTimer) {
          peer.disconnectTimer = setTimeout(() => this._fail(peer, new Error("WebRTC 连接中断")), 5000);
        } else if (pc.connectionState === "connected") {
          clearTimeout(peer.disconnectTimer);
          peer.disconnectTimer = null;
        }
      };
      return peer;
    }

    _sendSignal(peer, message) {
      if (!this._current(peer)) return;
      try {
        this.room.signal(peer.id, { ...message, connectionId: peer.connectionId });
      } catch (error) { this._fail(peer, error); }
    }

    _description(peer) {
      this._sendSignal(peer, { type: peer.pc.localDescription.type, description: peer.pc.localDescription.toJSON() });
      peer.descriptionSent = true;
      for (const candidate of peer.pending) this._sendSignal(peer, candidate);
      peer.pending.length = 0;
    }

    async _offer(id, attempt) {
      if (!this._member(id)) return;
      const connectionId = Array.from(root.crypto.getRandomValues(new Uint8Array(16)),
        (byte) => byte.toString(16).padStart(2, "0")).join("");
      const peer = this._create(id, connectionId, attempt);
      try {
        // Fetch fresh short-lived TURN credentials for each new connection.
        const config = await this._config();
        if (!this._current(peer)) return;
        peer.pc.setConfiguration(config);
        this._channel(peer, peer.pc.createDataChannel("state", { ordered: false, maxRetransmits: 0 }));
        this._channel(peer, peer.pc.createDataChannel("events", { ordered: true }));
        const offer = await peer.pc.createOffer();
        if (!this._current(peer)) return;
        await peer.pc.setLocalDescription(offer);
        if (this._current(peer)) this._description(peer);
      } catch (error) { this._fail(peer, error); }
    }

    async _signal(message) {
      const id = message.from;
      if (!this.config || !this._member(id)) return;
      const data = message.data;
      let peer = this.peers.get(id);
      if (data.type === "offer") {
        // Exactly one offerer per pair prevents simultaneous offer collisions.
        if (this._initiator(id) || peer?.connectionId === data.connectionId) return;
        peer = this._create(id, data.connectionId, 0);
        try {
          const config = await this._config();
          if (!this._current(peer)) return;
          peer.pc.setConfiguration(config);
          await peer.pc.setRemoteDescription(data.description);
          const answer = await peer.pc.createAnswer();
          if (!this._current(peer)) return;
          await peer.pc.setLocalDescription(answer);
          if (this._current(peer)) this._description(peer);
        } catch (error) { this._fail(peer, error); }
        return;
      }
      if (!peer || peer.connectionId !== data.connectionId || peer.failed) return;
      try {
        if (data.type === "answer" && this._initiator(id) && peer.pc.signalingState === "have-local-offer") {
          await peer.pc.setRemoteDescription(data.description);
        } else if (data.type === "candidate" && peer.pc.remoteDescription) {
          await peer.pc.addIceCandidate(data.candidate);
        }
      } catch (error) { this._fail(peer, error); }
    }

    _channel(peer, channel) {
      if (!this._current(peer) || !["state", "events"].includes(channel.label) || peer.channels[channel.label]) {
        channel.close();
        return;
      }
      peer.channels[channel.label] = channel;
      channel.onopen = () => {
        if (!this._current(peer) || peer.ready) return;
        if (["state", "events"].every((key) => peer.channels[key]?.readyState === "open")) {
          clearTimeout(peer.timer);
          peer.ready = true;
          this._emit("peeropen", { peerId: peer.id });
        }
      };
      channel.onclose = () => this._fail(peer, new Error("数据通道已关闭"));
      channel.onerror = () => this._fail(peer, new Error("数据通道出错"));
      channel.onmessage = ({ data }) => {
        if (!this._current(peer) || typeof data !== "string" || data.length > 16384) return;
        try {
          const message = JSON.parse(data);
          if (!message || typeof message !== "object") return;
            // Fragmented snapshots filter stale frames after reassembly. Filtering
            // individual datagrams here would discard valid reordered fragments.
            if (channel.label === "state") {
              if (!Number.isSafeInteger(message.seq)) return;
              if (!this.options.unorderedState) {
                if (message.seq <= peer.rx) return;
                peer.rx = message.seq;
              }
          }
          this._emit(channel.label === "state" ? "state" : "event", { peerId: peer.id, data: message.data });
        } catch { /* Ignore malformed peer messages. */ }
      };
    }

    _fail(peer, error) {
      if (!this._current(peer) || peer.failed) return;
      peer.failed = true;
      this._dispose(peer);
      if (peer.ready) this._emit("peerclose", { peerId: peer.id });
      peer.ready = false;
      if (this._initiator(peer.id) && peer.attempt < 2) {
        peer.timer = setTimeout(() => {
          if (this._current(peer)) this._offer(peer.id, peer.attempt + 1);
        }, 1000 * (peer.attempt + 1));
      }
      this._emit("error", { peerId: peer.id, error });
    }

    retry(peerId) {
      if (!this._member(peerId) || !this._initiator(peerId)) return false;
      this._offer(peerId, 0);
      return true;
    }

    _send(id, kind, data) {
      const peer = this.peers.get(id);
      const channel = peer?.channels[kind];
      if (!peer?.ready || channel?.readyState !== "open") return false;
      const message = JSON.stringify(kind === "state" ? { seq: peer.tx++, data } : { data });
      const bytes = new TextEncoder().encode(message).byteLength;
      const limit = kind === "state" ? 1200 : 16384;
      if (bytes > limit) throw new RangeError(`消息超过 ${limit} 字节`);
      if (channel.bufferedAmount + bytes > (kind === "state" ? 16384 : 65536)) return false;
      try { channel.send(message); return true; }
      catch (error) { this._fail(peer, error); return false; }
    }

    sendState(peerId, data) { return this._send(peerId, "state", data); }
    sendEvent(peerId, data) { return this._send(peerId, "events", data); }
    broadcastState(data) {
      let sent = 0;
      for (const id of this.peers.keys()) if (this.sendState(id, data)) sent++;
      return sent;
    }

    _dispose(peer) {
      clearTimeout(peer.timer);
      clearTimeout(peer.disconnectTimer);
      peer.pc.onconnectionstatechange = peer.pc.onicecandidate = peer.pc.ondatachannel = null;
      for (const channel of Object.values(peer.channels)) {
        channel.onopen = channel.onclose = channel.onerror = channel.onmessage = null;
        channel.close();
      }
      peer.pc.close();
    }

    _drop(id) {
      const peer = this.peers.get(id);
      if (!peer) return;
      this.peers.delete(id);
      this._dispose(peer);
      if (peer.ready) this._emit("peerclose", { peerId: id });
    }

    _clear() {
      this.active = false;
      this.generation++;
      for (const id of this.peers.keys()) this._drop(id);
    }

    close() {
      this.closed = true;
      this._clear();
      for (const unsubscribe of this.unsubscribers) unsubscribe();
      this.unsubscribers = [];
    }
  }

  root.GameHubRTC = GameHubRTC;
})(typeof window !== "undefined" ? window : globalThis);

