/* Educa-Connect MVP (LocalStorage)
   - Sem Firebase (a seguir migrar para Auth/Firestore mantendo UI)
*/
(() => {
  const LS_KEY = "ec_db_v1";
  const LS_SESSION = "ec_session_v1";

  const roleLabel = (r) =>
    ({
      student: "Student",
      teacher: "Professor",
      supervisor: "Supervisor",
      admin: "Administrator",
    })[r] || r;

  const nowISO = () => new Date().toISOString();
  const uid = () =>
    "u_" + Math.random().toString(16).slice(2) + Date.now().toString(16);

  const loadDB = () => {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const saveDB = (db) => localStorage.setItem(LS_KEY, JSON.stringify(db));

  const seedIfNeeded = () => {
    let db = loadDB();
    if (db) return db;

    const adminId = uid();
    const profId = uid();
    const supId = uid();
    const studentId = uid();

    db = {
      users: [
        {
          id: adminId,
          name: "Admin",
          email: "admin@educa.local",
          password: "admin123",
          role: "admin",
          createdAt: nowISO(),
        },
        {
          id: profId,
          name: "Prof. Maria",
          email: "prof@educa.local",
          password: "prof123",
          role: "professor",
          createdAt: nowISO(),
        },
        {
          id: supId,
          name: "Supervisor Manuel",
          email: "sup@educa.local",
          password: "sup123",
          role: "supervisor",
          createdAt: nowISO(),
        },
        {
          id: studentId,
          name: "Aluno João",
          email: "aluno@educa.local",
          password: "student123",
          role: "student",
          createdAt: nowISO(),
        },
      ],
      messages: [
        // { id, aId, bId, senderId, text, createdAt }
      ],
      events: [
        // { id, ownerId, datetimeISO, desc, participantIds:[], createdAt }
      ],
      feedbacks: [
        // { id, fromId, toStudentId, title, grade, message, createdAt }
      ],
      contactRequests: [
        // { id, name, email, desiredRole, message, createdAt }
      ],
    };

    // seed: um feedback inicial
    db.feedbacks.push({
      id: uid(),
      fromId: profId,
      toStudentId: studentId,
      title: "Bem-vindo ao estágio",
      grade: "",
      message:
        "Olá! Usa esta plataforma para combinar reuniões e partilhar progressos.",
      createdAt: nowISO(),
    });

    // seed: uma reunião futura
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(15, 30, 0, 0);
    db.events.push({
      id: uid(),
      ownerId: profId,
      datetimeISO: d.toISOString(),
      desc: "Reunião inicial de acompanhamento",
      participantIds: [studentId, supId],
      createdAt: nowISO(),
    });

    saveDB(db);
    return db;
  };

  const getSession = () => {
    const raw = localStorage.getItem(LS_SESSION);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const setSession = (userId) =>
    localStorage.setItem(LS_SESSION, JSON.stringify({ userId }));
  const clearSession = () => localStorage.removeItem(LS_SESSION);

  const getCurrentUser = (db) => {
    const s = getSession();
    if (!s?.userId) return null;
    return db.users.find((u) => u.id === s.userId) || null;
  };

  const requireAuth = (db, allowedRoles = null) => {
    const user = getCurrentUser(db);
    if (!user) {
      window.location.href = "index.html";
      return null;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      window.location.href = "dashboard.html";
      return null;
    }
    return user;
  };

  const formatDT = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const escapeHTML = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const byDateAsc = (a, b) => new Date(a.datetimeISO) - new Date(b.datetimeISO);
  const byCreatedDesc = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

  // Helpers UI sidebar
  const hydrateSidebar = (user) => {
    const who = document.getElementById("whoami");
    if (who) who.textContent = `${user.name} • ${roleLabel(user.role)}`;

    const adminLink = document.getElementById("adminLink");
    if (adminLink) adminLink.hidden = user.role !== "admin";

    const logout = document.getElementById("btnLogout");
    if (logout) {
      logout.addEventListener("click", () => {
        clearSession();
        window.location.href = "index.html";
      });
    }
  };

  // ---------- Pages ----------
  const pageLogin = (db) => {
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();

    const email = document.getElementById("email");
    const pass = document.getElementById("password");
    const role = document.getElementById("role");
    const btn = document.getElementById("btnLogin");
    const err = document.getElementById("loginError");

    const showErr = (m) => {
      err.textContent = m;
      err.hidden = !m;
    };

    btn.addEventListener("click", () => {
      showErr("");
      const e = (email.value || "").trim().toLowerCase();
      const p = pass.value || "";
      const r = role.value || "";

      if (!e || !p || !r) return showErr("Preenche email, password e papel.");

      const user = db.users.find((u) => u.email.toLowerCase() === e);
      if (!user)
        return showErr(
          "Conta não encontrada. Usa “Não tenho conta” para contactar o admin.",
        );
      if (user.password !== p) return showErr("Password incorreta.");
      if (user.role !== r)
        return showErr("O papel selecionado não corresponde à tua conta.");

      setSession(user.id);
      window.location.href = "dashboard.html";
    });

    // Se já estiver logado, vai para dashboard
    const u = getCurrentUser(db);
    if (u) window.location.href = "dashboard.html";
  };

  const pageDashboard = (db) => {
    const user = requireAuth(db);
    if (!user) return;
    hydrateSidebar(user);

    const greeting = document.getElementById("greeting");
    const subtitle = document.getElementById("subtitle");
    const rolePill = document.getElementById("rolePill");

    greeting.textContent = `Olá, ${user.name}`;
    rolePill.textContent = roleLabel(user.role);

    subtitle.textContent =
      user.role === "student"
        ? "Vê feedbacks, combina reuniões e fala com professor/supervisor."
        : user.role === "admin"
          ? "Gere utilizadores, pedidos e supervisão geral."
          : "Responde a mensagens, agenda reuniões e publica feedbacks.";

    // Next meetings
    const nextEl = document.getElementById("nextMeetings");
    const visibleEvents = db.events
      .filter(
        (ev) =>
          ev.ownerId === user.id || (ev.participantIds || []).includes(user.id),
      )
      .slice()
      .sort(byDateAsc)
      .filter((ev) => new Date(ev.datetimeISO) >= new Date())
      .slice(0, 3);

    if (!visibleEvents.length) {
      nextEl.textContent = "Sem reuniões futuras (por enquanto).";
    } else {
      nextEl.innerHTML = visibleEvents
        .map((ev) => {
          const owner = db.users.find((u) => u.id === ev.ownerId);
          return `<div class="muted">• <b>${escapeHTML(ev.desc)}</b> — ${formatDT(ev.datetimeISO)} <span class="tiny">(criado por ${escapeHTML(owner?.name || "—")})</span></div>`;
        })
        .join("");
    }

    // Feedback summary
    const fbSummary = document.getElementById("feedbackSummary");
    const myFeedbacks =
      user.role === "student"
        ? db.feedbacks
            .filter((fb) => fb.toStudentId === user.id)
            .slice()
            .sort(byCreatedDesc)
            .slice(0, 3)
        : db.feedbacks
            .filter((fb) => fb.fromId === user.id)
            .slice()
            .sort(byCreatedDesc)
            .slice(0, 3);

    if (!myFeedbacks.length) fbSummary.textContent = "Sem feedbacks recentes.";
    else {
      fbSummary.innerHTML = myFeedbacks
        .map((fb) => {
          const from = db.users.find((u) => u.id === fb.fromId);
          const to = db.users.find((u) => u.id === fb.toStudentId);
          const who =
            user.role === "student"
              ? `de ${escapeHTML(from?.name || "—")}`
              : `para ${escapeHTML(to?.name || "—")}`;
          const grade = fb.grade
            ? ` • <span class="badge">${escapeHTML(fb.grade)}</span>`
            : "";
          return `<div class="muted">• <b>${escapeHTML(fb.title)}</b> ${who}${grade}</div>`;
        })
        .join("");
    }

    // Feedback panel
    const panel = document.getElementById("feedbackPanel");
    const form = document.getElementById("fbForm");
    const list = document.getElementById("fbList");
    const fbTitle = document.getElementById("fbTitle");
    const fbHint = document.getElementById("fbHint");

    const ok = document.getElementById("fbOk");
    const er = document.getElementById("fbErr");
    const showOk = (m) => {
      ok.textContent = m;
      ok.hidden = !m;
    };
    const showErr = (m) => {
      er.textContent = m;
      er.hidden = !m;
    };

    const isStaff = user.role === "teacher" || user.role === "supervisor";
    fbTitle.textContent = isStaff
      ? "Publicar feedback / avaliação"
      : "Os teus feedbacks / avaliações";
    fbHint.textContent = isStaff
      ? "Seleciona um aluno e envia avaliação/feedback."
      : "Aqui aparecem feedbacks do professor e/ou supervisor.";

    // Staff form
    if (isStaff) {
      form.hidden = false;
      const sel = document.getElementById("fbStudent");
      const students = db.users.filter((u) => u.role === "student");
      sel.innerHTML = students
        .map(
          (s) =>
            `<option value="${s.id}">${escapeHTML(s.name)} • ${escapeHTML(s.email)}</option>`,
        )
        .join("");

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        showOk("");
        showErr("");

        const toId = sel.value;
        const title = (
          document.getElementById("fbTitleInput").value || ""
        ).trim();
        const grade = (document.getElementById("fbGrade").value || "").trim();
        const msg = (document.getElementById("fbMessage").value || "").trim();

        if (!toId || !title || !msg)
          return showErr("Preenche aluno, título e mensagem.");

        db.feedbacks.push({
          id: uid(),
          fromId: user.id,
          toStudentId: toId,
          title,
          grade,
          message: msg,
          createdAt: nowISO(),
        });
        saveDB(db);
        form.reset();
        showOk("Feedback publicado com sucesso!");
        renderFeedbackList();
      });
    }

    const renderFeedbackList = () => {
      const items =
        user.role === "student"
          ? db.feedbacks.filter((fb) => fb.toStudentId === user.id)
          : user.role === "admin"
            ? db.feedbacks.slice()
            : db.feedbacks.filter((fb) => fb.fromId === user.id);

      const sorted = items.slice().sort(byCreatedDesc);
      if (!sorted.length) {
        list.innerHTML = `<div class="muted">Sem itens para mostrar.</div>`;
        return;
      }

      list.innerHTML = sorted
        .map((fb) => {
          const from = db.users.find((u) => u.id === fb.fromId);
          const to = db.users.find((u) => u.id === fb.toStudentId);
          const grade = fb.grade
            ? `<span class="badge">${escapeHTML(fb.grade)}</span>`
            : `<span class="badge">Sem nota</span>`;
          return `
          <div class="item">
            <div class="itemTop">
              <div>
                <div><b>${escapeHTML(fb.title)}</b> ${grade}</div>
                <div class="muted tiny">${formatDT(fb.createdAt)} • de ${escapeHTML(from?.name || "—")} para ${escapeHTML(to?.name || "—")}</div>
              </div>
              <span class="badge">${roleLabel(from?.role || "—")}</span>
            </div>
            <div style="margin-top:10px">${escapeHTML(fb.message).replaceAll("\n", "<br>")}</div>
          </div>
        `;
        })
        .join("");
    };

    renderFeedbackList();
  };

  const pageProfile = (db) => {
    const user = requireAuth(db);
    if (!user) return;
    hydrateSidebar(user);

    const pName = document.getElementById("pName");
    const pEmail = document.getElementById("pEmail");
    const pRole = document.getElementById("pRole");
    const form = document.getElementById("profileForm");

    const ok = document.getElementById("pOk");
    const er = document.getElementById("pErr");
    const showOk = (m) => {
      ok.textContent = m;
      ok.hidden = !m;
    };
    const showErr = (m) => {
      er.textContent = m;
      er.hidden = !m;
    };

    pName.value = user.name;
    pEmail.value = user.email;
    pRole.value = roleLabel(user.role);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showOk("");
      showErr("");

      const newName = (pName.value || "").trim();
      if (!newName) return showErr("O nome não pode estar vazio.");

      const u = db.users.find((x) => x.id === user.id);
      u.name = newName;
      saveDB(db);

      showOk("Perfil atualizado com sucesso!");
      hydrateSidebar(u);
    });
  };

  const pageChat = (db) => {
    const user = requireAuth(db);
    if (!user) return;
    hydrateSidebar(user);

    const peerSel = document.getElementById("chatPeer");
    const box = document.getElementById("chatBox");
    const form = document.getElementById("chatForm");
    const input = document.getElementById("chatInput");
    const err = document.getElementById("chatErr");
    const showErr = (m) => {
      err.textContent = m;
      err.hidden = !m;
    };

    // Peers: student vê teacher/supervisor; teacher/supervisor vê students; admin vê todos
    const peers = db.users
      .filter((u) => u.id !== user.id)
      .filter((u) => {
        if (user.role === "admin") return true;
        if (user.role === "student")
          return u.role === "teacher" || u.role === "supervisor";
        if (user.role === "teacher" || user.role === "supervisor")
          return u.role === "student";
        return false;
      });

    peerSel.innerHTML = peers
      .map(
        (p) =>
          `<option value="${p.id}">${escapeHTML(p.name)} • ${roleLabel(p.role)}</option>`,
      )
      .join("");

    const convoKey = (a, b) => [a, b].sort().join("__");
    const getMessages = (peerId) => {
      const key = convoKey(user.id, peerId);
      return db.messages
        .filter((m) => convoKey(m.aId, m.bId) === key)
        .slice()
        .sort((x, y) => new Date(x.createdAt) - new Date(y.createdAt));
    };

    const render = () => {
      const peerId = peerSel.value;
      if (!peerId) {
        box.innerHTML = `<div class="muted">Seleciona um destinatário.</div>`;
        return;
      }

      const peer = db.users.find((u) => u.id === peerId);
      const msgs = getMessages(peerId);

      if (!msgs.length) {
        box.innerHTML = `<div class="muted">Sem mensagens ainda. Diz “Olá”! 👋</div>`;
        return;
      }

      box.innerHTML = msgs
        .map((m) => {
          const sender = db.users.find((u) => u.id === m.senderId);
          const mine = m.senderId === user.id;
          return `
          <div class="bubble ${mine ? "me" : ""}">
            <div class="meta">${escapeHTML(sender?.name || "—")} • ${formatDT(m.createdAt)}</div>
            <div>${escapeHTML(m.text).replaceAll("\n", "<br>")}</div>
          </div>
        `;
        })
        .join("");

      box.scrollTop = box.scrollHeight;
    };

    peerSel.addEventListener("change", render);
    render();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showErr("");

      const peerId = peerSel.value;
      const text = (input.value || "").trim();
      if (!peerId) return showErr("Seleciona um destinatário.");
      if (!text) return;

      db.messages.push({
        id: uid(),
        aId: user.id,
        bId: peerId,
        senderId: user.id,
        text,
        createdAt: nowISO(),
      });
      saveDB(db);
      input.value = "";
      render();
    });
  };

  const pageCalendar = (db) => {
    const user = requireAuth(db);
    if (!user) return;
    hydrateSidebar(user);

    const form = document.getElementById("eventForm");
    const eDate = document.getElementById("eDate");
    const eTime = document.getElementById("eTime");
    const eDesc = document.getElementById("eDesc");
    const participants = document.getElementById("participants");
    const list = document.getElementById("eventList");

    const ok = document.getElementById("eOk");
    const er = document.getElementById("eErr");
    const showOk = (m) => {
      ok.textContent = m;
      ok.hidden = !m;
    };
    const showErr = (m) => {
      er.textContent = m;
      er.hidden = !m;
    };

    // defaults
    const d = new Date();
    d.setDate(d.getDate() + 1);
    eDate.valueAsDate = d;
    eTime.value = "10:00";

    // Participants checklist
    const people = db.users.filter((u) => u.id !== user.id);
    participants.innerHTML = people
      .map(
        (p) => `
      <label class="chip">
        <input type="checkbox" value="${p.id}">
        <span>${escapeHTML(p.name)} <span class="muted tiny">• ${roleLabel(p.role)}</span></span>
      </label>
    `,
      )
      .join("");

    const visibleEvents = () =>
      db.events
        .filter(
          (ev) =>
            ev.ownerId === user.id ||
            (ev.participantIds || []).includes(user.id),
        )
        .slice()
        .sort(byDateAsc);

    const renderList = () => {
      const items = visibleEvents();
      if (!items.length) {
        list.innerHTML = `<div class="muted">Sem eventos ainda. Cria o primeiro 👇</div>`;
        return;
      }

      list.innerHTML = items
        .map((ev) => {
          const owner = db.users.find((u) => u.id === ev.ownerId);
          const partNames = (ev.participantIds || [])
            .map((id) => db.users.find((u) => u.id === id)?.name)
            .filter(Boolean);

          const mine =
            ev.ownerId === user.id
              ? `<span class="badge">Criado por ti</span>`
              : `<span class="badge">Criado por ${escapeHTML(owner?.name || "—")}</span>`;
          const parts = partNames.length
            ? `<div class="muted tiny">Participantes: ${escapeHTML(partNames.join(", "))}</div>`
            : `<div class="muted tiny">Sem participantes</div>`;

          return `
          <div class="item">
            <div class="itemTop">
              <div>
                <div><b>${escapeHTML(ev.desc)}</b></div>
                <div class="muted tiny">${formatDT(ev.datetimeISO)}</div>
                ${parts}
              </div>
              ${mine}
            </div>
          </div>
        `;
        })
        .join("");
    };

    renderList();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showOk("");
      showErr("");

      const date = eDate.value;
      const time = eTime.value;
      const desc = (eDesc.value || "").trim();

      if (!date || !time || !desc)
        return showErr("Preenche data, hora e descrição.");

      const dt = new Date(`${date}T${time}`);
      if (isNaN(dt.getTime())) return showErr("Data/hora inválida.");

      const selected = [
        ...participants.querySelectorAll("input[type=checkbox]:checked"),
      ].map((x) => x.value);

      db.events.push({
        id: uid(),
        ownerId: user.id,
        datetimeISO: dt.toISOString(),
        desc,
        participantIds: selected,
        createdAt: nowISO(),
      });
      saveDB(db);
      form.reset();

      // re-set sensible defaults after reset
      const dd = new Date();
      dd.setDate(dd.getDate() + 1);
      eDate.valueAsDate = dd;
      eTime.value = "10:00";

      showOk("Evento criado com sucesso!");
      renderList();
    });
  };

  const pageContact = (db) => {
    const form = document.getElementById("contactForm");
    const name = document.getElementById("cName");
    const email = document.getElementById("cEmail");
    const role = document.getElementById("cRole");
    const msg = document.getElementById("cMsg");
    const ok = document.getElementById("cOk");
    const er = document.getElementById("cErr");

    const showOk = (m) => {
      ok.textContent = m;
      ok.hidden = !m;
    };
    const showErr = (m) => {
      er.textContent = m;
      er.hidden = !m;
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      showOk("");
      showErr("");

      const n = (name.value || "").trim();
      const em = (email.value || "").trim().toLowerCase();
      const r = role.value;
      const m = (msg.value || "").trim();

      if (!n || !em || !m) return showErr("Preenche nome, email e mensagem.");

      db.contactRequests.push({
        id: uid(),
        name: n,
        email: em,
        desiredRole: r,
        message: m,
        createdAt: nowISO(),
      });
      saveDB(db);

      form.reset();
      showOk("Pedido enviado ✅ O administrador verá no painel “Admin”.");
    });
  };

  const pageAdmin = (db) => {
    const user = requireAuth(db, ["admin"]);
    if (!user) return;
    hydrateSidebar(user);

    const tbody = document.querySelector("#userTable tbody");
    const adminErr = document.getElementById("adminErr");

    const createForm = document.getElementById("createUserForm");
    const cuName = document.getElementById("cuName");
    const cuEmail = document.getElementById("cuEmail");
    const cuPass = document.getElementById("cuPass");
    const cuRole = document.getElementById("cuRole");
    const cuOk = document.getElementById("cuOk");
    const cuErr = document.getElementById("cuErr");

    const contactList = document.getElementById("contactList");

    const show = (el, m) => {
      el.textContent = m;
      el.hidden = !m;
    };

    const renderUsers = () => {
      tbody.innerHTML = "";
      adminErr.hidden = true;

      const users = db.users
        .slice()
        .sort(
          (a, b) =>
            a.role.localeCompare(b.role) || a.name.localeCompare(b.name),
        );

      for (const u of users) {
        const tr = document.createElement("tr");

        const isMe = u.id === user.id;

        tr.innerHTML = `
          <td>
            <input class="miniInput" data-id="${u.id}" data-field="name" value="${escapeHTML(u.name)}" ${isMe ? "" : ""}>
          </td>
          <td class="muted">${escapeHTML(u.email)}</td>
          <td>
            <select class="miniSelect" data-id="${u.id}" data-field="role" ${isMe ? "" : ""}>
              <option value="student" ${u.role === "student" ? "selected" : ""}>student</option>
              <option value="teacher" ${u.role === "teacher" ? "selected" : ""}>teacher</option>
              <option value="supervisor" ${u.role === "supervisor" ? "selected" : ""}>supervisor</option>
              <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
            </select>
          </td>
          <td class="right">
            <button class="btn danger small" data-action="delete" data-id="${u.id}" ${isMe ? "disabled" : ""}>🗑️</button>
          </td>
        `;

        tbody.appendChild(tr);
      }

      // wire inputs
      tbody
        .querySelectorAll("input[data-field], select[data-field]")
        .forEach((el) => {
          el.addEventListener("change", () => {
            const id = el.getAttribute("data-id");
            const field = el.getAttribute("data-field");
            const value = (el.value || "").trim();

            const target = db.users.find((x) => x.id === id);
            if (!target) return;

            if (field === "name" && !value) {
              adminErr.hidden = false;
              adminErr.textContent = "Nome não pode estar vazio.";
              renderUsers();
              return;
            }

            target[field] = value;
            saveDB(db);
          });
        });

      // wire delete
      tbody.querySelectorAll("button[data-action=delete]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          const target = db.users.find((x) => x.id === id);
          if (!target) return;

          if (!confirm(`Remover utilizador ${target.name} (${target.email})?`))
            return;

          // Remove user
          db.users = db.users.filter((x) => x.id !== id);

          // Clean related data
          db.messages = db.messages.filter(
            (m) => m.aId !== id && m.bId !== id && m.senderId !== id,
          );
          db.events = db.events
            .filter((ev) => ev.ownerId !== id)
            .map((ev) => ({
              ...ev,
              participantIds: (ev.participantIds || []).filter(
                (pid) => pid !== id,
              ),
            }));
          db.feedbacks = db.feedbacks.filter(
            (fb) => fb.fromId !== id && fb.toStudentId !== id,
          );

          saveDB(db);
          renderUsers();
          renderContacts();
        });
      });
    };

    // Create user
    createForm.addEventListener("submit", (e) => {
      e.preventDefault();
      show(cuOk, "");
      show(cuErr, "");

      const n = (cuName.value || "").trim();
      const em = (cuEmail.value || "").trim().toLowerCase();
      const pw = (cuPass.value || "").trim();
      const r = cuRole.value;

      if (!n || !em || !pw || !r)
        return show(cuErr, "Preenche nome, email, password e papel.");
      if (db.users.some((u) => u.email.toLowerCase() === em))
        return show(cuErr, "Já existe um utilizador com esse email.");

      db.users.push({
        id: uid(),
        name: n,
        email: em,
        password: pw,
        role: r,
        createdAt: nowISO(),
      });
      saveDB(db);

      createForm.reset();
      show(cuOk, "Utilizador criado com sucesso!");
      renderUsers();
    });

    const renderContacts = () => {
      const reqs = db.contactRequests.slice().sort(byCreatedDesc);
      if (!reqs.length) {
        contactList.innerHTML = `<div class="muted">Sem pedidos por enquanto.</div>`;
        return;
      }
      contactList.innerHTML = reqs
        .map(
          (r) => `
        <div class="item">
          <div class="itemTop">
            <div>
              <div><b>${escapeHTML(r.name)}</b> <span class="badge">${escapeHTML(r.email)}</span></div>
              <div class="muted tiny">${formatDT(r.createdAt)} • Quer entrar como <b>${roleLabel(r.desiredRole)}</b></div>
            </div>
            <button class="btn danger small" data-delreq="${r.id}">🗑️</button>
          </div>
          <div style="margin-top:10px">${escapeHTML(r.message).replaceAll("\n", "<br>")}</div>
        </div>
      `,
        )
        .join("");

      contactList.querySelectorAll("button[data-delreq]").forEach((b) => {
        b.addEventListener("click", () => {
          const id = b.getAttribute("data-delreq");
          if (!confirm("Apagar este pedido?")) return;
          db.contactRequests = db.contactRequests.filter((x) => x.id !== id);
          saveDB(db);
          renderContacts();
        });
      });
    };

    renderUsers();
    renderContacts();
  };

  // ---------- Router ----------
  const main = () => {
    const db = seedIfNeeded();
    const page = document.body?.dataset?.page;

    const map = {
      login: () => pageLogin(db),
      dashboard: () => pageDashboard(db),
      chat: () => pageChat(db),
      profile: () => pageProfile(db),
      calendar: () => pageCalendar(db),
      contact: () => pageContact(db),
      admin: () => pageAdmin(db),
    };

    if (map[page]) map[page]();
  };

  document.addEventListener("DOMContentLoaded", main);
})();
