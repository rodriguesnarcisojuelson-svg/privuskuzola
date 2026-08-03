(function () {
  "use strict";

  if (window.__PRIVUS_ASSISTANT_LOADED__) return;
  window.__PRIVUS_ASSISTANT_LOADED__ = true;

  const CONFIG = {
    symbolUrl: "/privus-symbol.PNG",
    priaUrl: "/pria-planos.html",
    bookingUrl: "https://privuskuzola.pt/#contacto",
    email: "contacto@privuskuzola.pt",
    whatsappUrl:
      "https://wa.me/351936246971?text=" +
      encodeURIComponent(
        "Olá Privus. Gostaria de esclarecer uma necessidade regulatória da minha organização."
      ),
  };

  const ACTIONS = {
    quick: [
      { label: "Conhecer os serviços", value: "servicos" },
      { label: "Explorar o Framework", value: "framework" },
      { label: "Como trabalha a Privus?", value: "metodologia" },
      { label: "Realizar o PRIA", value: "pria", primary: true },
    ],

    frameworks: [
      { label: "RGPD", value: "rgpd" },
      { label: "AI Act", value: "ai-act" },
      { label: "NIS2", value: "nis2" },
      { label: "DORA", value: "dora" },
      { label: "ISO 27001", value: "iso-27001" },
      { label: "ISO 22301", value: "iso-22301" },
      { label: "ISO 37301", value: "iso-37301" },
    ],

    contact: [
      {
        label: "Agendar conversa",
        value: "open-booking",
        primary: true,
      },
      {
        label: "Falar no WhatsApp",
        value: "open-whatsapp",
      },
      {
        label: "Enviar email",
        value: "open-email",
      },
    ],

    pria: [
      {
        label: "Começar o PRIA",
        value: "open-pria",
        primary: true,
      },
      {
        label: "Agendar conversa",
        value: "open-booking",
      },
    ],
  };

  const RESPONSES = {
    servicos: {
      text:
        "A Privus apoia organizações em diagnóstico regulatório, implementação, compliance contínuo e formação. Integramos RGPD, AI Act, NIS2, DORA e normas ISO numa estrutura coerente, adaptada ao setor, dimensão e risco da organização. Por onde pretende começar?",

      actions: [
        {
          label: "Diagnóstico PRIA",
          value: "pria",
          primary: true,
        },
        {
          label: "Implementação",
          value: "implementacao",
        },
        {
          label: "Compliance contínuo",
          value: "compliance",
        },
        {
          label: "Formação",
          value: "formacao",
        },
      ],
    },

    framework: {
      text:
        "O Framework Privus liga princípios, avaliação de maturidade, diagnóstico, implementação e melhoria contínua. Em vez de tratar cada norma isoladamente, identifica interseções, reduz duplicação documental e transforma requisitos em processos, controlos e evidências demonstráveis.",

      actions: ACTIONS.frameworks,
    },

    metodologia: {
      text:
        "A Privus começa pelo contexto real da organização: atividade, dimensão, exposição, requisitos aplicáveis e evidência existente. O PRIA mede a maturidade regulatória; o roadmap converte o diagnóstico em prioridades; a implementação transforma essas prioridades em medidas operacionais.",

      actions: ACTIONS.pria,
    },

    pria: {
      text:
        "O PRIA — Privus Regulatory Impact Assessment — avalia a maturidade regulatória em 10 pilares e 4 dimensões. Produz um nível de maturidade, riscos, pontos fortes, recomendações e um roadmap de 30, 90 e 180 dias. É o ponto de entrada recomendado para uma análise estruturada.",

      actions: ACTIONS.pria,
    },

    implementacao: {
      text:
        "Na implementação, a Privus transforma as recomendações do diagnóstico em medidas concretas: governação, processos, documentação, responsabilidades, controlos técnicos e evidências. O âmbito e a proposta são definidos de acordo com as prioridades da organização.",

      actions: ACTIONS.contact,
    },

    compliance: {
      text:
        "O serviço de compliance contínuo mantém a estrutura atualizada através de monitorização regulatória, revisões periódicas, acompanhamento de ações e suporte a alterações ou incidentes. O modelo é ajustado às necessidades concretas da organização.",

      actions: ACTIONS.contact,
    },

    formacao: {
      text:
        "A formação é desenhada para as funções e riscos reais da organização. Pode abranger proteção de dados, utilização responsável de IA, segurança, continuidade e responsabilidades de gestão, com conteúdos ajustados aos gaps identificados.",

      actions: ACTIONS.contact,
    },

    rgpd: {
      text:
        "O RGPD exige mais do que uma política de privacidade: bases legais, governação, direitos dos titulares, contratos, segurança, gestão de incidentes e capacidade de demonstrar conformidade. A Privus avalia a aplicação prática dessas obrigações e estrutura a implementação.",

      actions: ACTIONS.pria,
    },

    "ai-act": {
      text:
        "O AI Act distribui obrigações conforme o papel da organização e o risco dos sistemas de IA. O trabalho começa pelo inventário e classificação, seguindo-se governação, supervisão humana, documentação, literacia e articulação com o RGPD.",

      actions: ACTIONS.pria,
    },

    nis2: {
      text:
        "A NIS2 reforça a responsabilidade dos órgãos de gestão, a gestão de riscos, a segurança da cadeia de fornecimento e a comunicação de incidentes. A ISO 27001 pode apoiar a implementação, mas não substitui a análise jurídica de aplicabilidade.",

      actions: ACTIONS.pria,
    },

    dora: {
      text:
        "O DORA estabelece requisitos de resiliência operacional digital para entidades financeiras e parte da sua cadeia de fornecedores. Abrange governação de risco TIC, incidentes, testes de resiliência, terceiros e partilha de informação.",

      actions: ACTIONS.pria,
    },

    "iso-27001": {
      text:
        "A ISO 27001 estrutura um sistema de gestão da segurança da informação baseado em risco. A preparação exige âmbito, responsabilidades, avaliação de risco, controlos, evidências, auditoria e melhoria contínua — articulados com RGPD e NIS2 quando aplicável.",

      actions: ACTIONS.pria,
    },

    "iso-22301": {
      text:
        "A ISO 22301 organiza a continuidade de negócio: análise de impacto, estratégias de recuperação, planos, testes e melhoria. O objetivo é criar capacidade real de resposta, não apenas um documento de continuidade.",

      actions: ACTIONS.pria,
    },

    "iso-37301": {
      text:
        "A ISO 37301 estrutura um sistema de gestão de compliance baseado em obrigações, riscos, liderança, cultura e melhoria contínua. A Privus transforma o referencial numa arquitetura operacional e demonstrável.",

      actions: ACTIONS.pria,
    },

    "iso27001-nis2": {
      text:
        "A ISO 27001 não substitui a NIS2. A norma fornece uma estrutura de gestão da segurança que pode suportar várias medidas da Diretiva, mas o cumprimento legal depende do âmbito, das obrigações de governação, da comunicação de incidentes e do enquadramento concreto da entidade.",

      actions: ACTIONS.pria,
    },

    contactos: {
      text:
        "Pode agendar uma conversa inicial, contactar a Privus pelo WhatsApp ou escrever para contacto@privuskuzola.pt. Para um diagnóstico estruturado, pode avançar diretamente para o PRIA.",

      actions: ACTIONS.contact,
    },

    precos: {
      text:
        "O PRIA tem planos próprios disponíveis na respetiva página. Os serviços de implementação, compliance contínuo e formação são adaptados ao âmbito e às necessidades de cada organização, pelo que são apresentados através de proposta.",

      actions: [
        {
          label: "Ver o PRIA",
          value: "open-pria",
          primary: true,
        },
        {
          label: "Solicitar proposta",
          value: "open-booking",
        },
      ],
    },

    fallback: {
      text:
        "Essa questão pode depender do setor, território, dimensão e atividade concreta da organização. Para evitar uma orientação incompleta, não realizo análises individualizadas. Posso explicar os serviços da Privus, apresentar um referencial ou encaminhar para o PRIA e para a equipa.",

      actions: [
        {
          label: "Conhecer os serviços",
          value: "servicos",
        },
        {
          label: "Explorar o Framework",
          value: "framework",
        },
        {
          label: "Realizar o PRIA",
          value: "open-pria",
          primary: true,
        },
        {
          label: "Falar com a equipa",
          value: "contactos",
        },
      ],
    },
  };

  const INITIAL = {
    text:
      "Olá. Sou o Assistente Privus. Posso explicar, de forma breve, como a Privus trabalha e como os principais referenciais regulatórios se relacionam. Não realizo diagnósticos individuais — para isso existe o PRIA.",

    actions: ACTIONS.quick,
  };

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function matchIntent(input) {
    const value = normalize(input);

    if (
      value.includes("27001") &&
      (value.includes("nis2") || value.includes("nis 2"))
    ) {
      return "iso27001-nis2";
    }

    if (value.includes("22301") || value.includes("continuidade")) {
      return "iso-22301";
    }

    if (
      value.includes("27001") ||
      value.includes("seguranca da informacao") ||
      value.includes("sgsi")
    ) {
      return "iso-27001";
    }

    if (
      value.includes("37301") ||
      value.includes("sistema de compliance")
    ) {
      return "iso-37301";
    }

    if (
      value.includes("rgpd") ||
      value.includes("dados pessoais") ||
      value.includes("privacidade")
    ) {
      return "rgpd";
    }

    if (
      value.includes("ai act") ||
      value.includes("inteligencia artificial") ||
      value === "ia"
    ) {
      return "ai-act";
    }

    if (
      value.includes("nis2") ||
      value.includes("nis 2") ||
      value.includes("ciberseguranca")
    ) {
      return "nis2";
    }

    if (
      value.includes("dora") ||
      value.includes("resiliencia digital")
    ) {
      return "dora";
    }

    if (
      value.includes("preco") ||
      value.includes("valor") ||
      value.includes("custo") ||
      value.includes("quanto")
    ) {
      return "precos";
    }

    if (
      value.includes("formacao") ||
      value.includes("curso")
    ) {
      return "formacao";
    }

    if (
      value.includes("implementacao") ||
      value.includes("implementar")
    ) {
      return "implementacao";
    }

    if (
      value.includes("continuo") ||
      value.includes("acompanhamento")
    ) {
      return "compliance";
    }

    if (
      value.includes("pria") ||
      value.includes("diagnostico") ||
      value.includes("maturidade")
    ) {
      return "pria";
    }

    if (
      value.includes("metodologia") ||
      value.includes("como trabalha") ||
      value.includes("como funciona")
    ) {
      return "metodologia";
    }

    if (
      value.includes("framework") ||
      value.includes("referencial") ||
      value.includes("norma")
    ) {
      return "framework";
    }

    if (
      value.includes("servico") ||
      value.includes("o que fazem") ||
      value.includes("o que faz")
    ) {
      return "servicos";
    }

    if (
      value.includes("contact") ||
      value.includes("whatsapp") ||
      value.includes("email") ||
      value.includes("agendar")
    ) {
      return "contactos";
    }

    return "fallback";
  }

  const host = document.createElement("div");

  host.id = "privus-assistant-root";

  document.body.appendChild(host);

  const root = host.attachShadow({
    mode: "open",
  });

  root.innerHTML = `
    <style>
      :host {
        --pv-navy: #0D1B2A;
        --pv-navy-deep: #08131F;
        --pv-gold: #C8A96E;
        --pv-gold-light: #D9BE90;
        --pv-cream: #F0EBE0;
        --pv-paper: #FBFAF7;
        --pv-muted: #69727B;
        all: initial;
      }

      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      button,
      input {
        font: inherit;
      }

      .pv-launcher {
        position: fixed;
        right: 22px;
        bottom: 22px;
        z-index: 2147483000;
        display: flex;
        align-items: center;
        gap: 11px;
        border: 1px solid rgba(200, 169, 110, 0.5);
        border-radius: 999px;
        padding: 9px 16px 9px 9px;
        background: var(--pv-navy);
        color: #FFFFFF;
        box-shadow: 0 12px 38px rgba(8, 19, 31, 0.28);
        font: 500 13px/1.2 "Outfit", "Segoe UI", Arial, sans-serif;
        cursor: pointer;
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
      }

      .pv-launcher:hover {
        transform: translateY(-2px);
        box-shadow: 0 16px 42px rgba(8, 19, 31, 0.34);
      }

      .pv-launcher:focus-visible,
      .pv-close:focus-visible,
      .pv-restart:focus-visible,
      .pv-action:focus-visible,
      .pv-send:focus-visible,
      .pv-input:focus-visible {
        outline: 3px solid rgba(200, 169, 110, 0.55);
        outline-offset: 2px;
      }

      .pv-mark {
        display: block;
        width: 38px;
        height: 38px;
        border-radius: 10px;
        object-fit: cover;
        background: var(--pv-navy-deep);
      }

      .pv-launcher-label {
        white-space: nowrap;
      }

      .pv-unread {
        position: absolute;
        right: 2px;
        top: -3px;
        display: none;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #7BAE7F;
        border: 2px solid #FFFFFF;
      }

      .pv-unread.is-visible {
        display: block;
      }

      .pv-panel {
        position: fixed;
        right: 22px;
        bottom: 82px;
        z-index: 2147483001;
        width: min(410px, calc(100vw - 28px));
        height: min(650px, calc(100dvh - 108px));
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(200, 169, 110, 0.38);
        border-radius: 8px;
        background: var(--pv-paper);
        box-shadow: 0 26px 80px rgba(8, 19, 31, 0.35);
        font-family: "Outfit", "Segoe UI", Arial, sans-serif;
        color: var(--pv-navy);
        opacity: 0;
        visibility: hidden;
        transform: translateY(14px) scale(0.98);
        transform-origin: bottom right;
        transition:
          opacity 0.2s ease,
          visibility 0.2s ease,
          transform 0.2s ease;
      }

      .pv-panel.is-open {
        opacity: 1;
        visibility: visible;
        transform: none;
      }

      .pv-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 74px;
        padding: 14px 15px;
        background: var(--pv-navy);
        color: #FFFFFF;
      }

      .pv-identity {
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
      }

      .pv-seal {
        display: block;
        flex: 0 0 auto;
        width: 42px;
        height: 42px;
        border: 1px solid rgba(200, 169, 110, 0.48);
        border-radius: 9px;
        background: var(--pv-navy-deep);
        object-fit: cover;
      }

      .pv-title {
        margin: 0;
        font: 600 16px/1.25 "Cormorant Garamond", Georgia, serif;
        letter-spacing: 0.01em;
      }

      .pv-status {
        margin: 3px 0 0;
        color: #C8BFAF;
        font: 400 10px/1.3 "Outfit", "Segoe UI", Arial, sans-serif;
      }

      .pv-status-dot {
        display: inline-block;
        width: 6px;
        height: 6px;
        margin-right: 5px;
        border-radius: 50%;
        background: #7BAE7F;
      }

      .pv-header-actions {
        display: flex;
        align-items: center;
        gap: 2px;
      }

      .pv-restart,
      .pv-close {
        display: grid;
        place-items: center;
        border: 0;
        background: transparent;
        color: #D9D4CA;
        cursor: pointer;
      }

      .pv-restart {
        width: 34px;
        height: 34px;
        font-size: 17px;
      }

      .pv-close {
        width: 36px;
        height: 36px;
        font-size: 24px;
        font-weight: 300;
      }

      .pv-restart:hover,
      .pv-close:hover {
        color: var(--pv-gold-light);
      }

      .pv-disclaimer {
        padding: 8px 13px;
        border-bottom: 1px solid rgba(200, 169, 110, 0.22);
        background: var(--pv-cream);
        color: #6B6458;
        text-align: center;
        font: 400 9px/1.35 "Outfit", "Segoe UI", Arial, sans-serif;
        letter-spacing: 0.03em;
      }

      .pv-conversation {
        flex: 1;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 18px 14px 8px;
        scrollbar-width: thin;
        scrollbar-color: rgba(13, 27, 42, 0.2) transparent;
      }

      .pv-row {
        display: flex;
        align-items: flex-start;
        gap: 7px;
        margin: 0 0 17px;
      }

      .pv-row.is-user {
        justify-content: flex-end;
      }

      .pv-mini {
        display: block;
        flex: 0 0 auto;
        width: 25px;
        height: 25px;
        margin-top: 2px;
        border-radius: 6px;
        background: var(--pv-navy);
        object-fit: cover;
      }

      .pv-stack {
        max-width: calc(100% - 34px);
      }

      .pv-bubble {
        padding: 11px 13px;
        border: 1px solid rgba(13, 27, 42, 0.1);
        border-radius: 2px 11px 11px 11px;
        background: #FFFFFF;
        box-shadow: 0 3px 12px rgba(13, 27, 42, 0.035);
        color: var(--pv-navy);
        font: 400 12.5px/1.55 "Outfit", "Segoe UI", Arial, sans-serif;
        white-space: pre-line;
      }

      .pv-row.is-user .pv-bubble {
        border-color: var(--pv-navy);
        border-radius: 11px 2px 11px 11px;
        background: var(--pv-navy);
        color: #FFFFFF;
      }

      .pv-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
        margin-top: 7px;
      }

      .pv-action {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        min-height: 38px;
        padding: 8px 9px;
        border: 1px solid rgba(13, 27, 42, 0.17);
        border-radius: 3px;
        background: transparent;
        color: var(--pv-navy);
        text-align: left;
        font: 500 10.5px/1.25 "Outfit", "Segoe UI", Arial, sans-serif;
        cursor: pointer;
        transition:
          background 0.15s ease,
          border-color 0.15s ease;
      }

      .pv-action:hover {
        border-color: var(--pv-gold);
        background: rgba(200, 169, 110, 0.1);
      }

      .pv-action::after {
        content: "→";
        color: var(--pv-gold);
        font-size: 14px;
      }

      .pv-action.is-primary {
        border-color: var(--pv-gold);
        background: var(--pv-gold);
        color: var(--pv-navy-deep);
        font-weight: 600;
      }

      .pv-action.is-primary::after {
        color: var(--pv-navy);
      }

      .pv-typing {
        display: flex;
        align-items: center;
        gap: 4px;
        width: 58px;
        height: 35px;
        padding: 0 13px;
        border: 1px solid rgba(13, 27, 42, 0.1);
        border-radius: 2px 11px 11px 11px;
        background: #FFFFFF;
      }

      .pv-typing span {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--pv-gold);
        animation: pv-pulse 1s infinite ease-in-out;
      }

      .pv-typing span:nth-child(2) {
        animation-delay: 0.13s;
      }

      .pv-typing span:nth-child(3) {
        animation-delay: 0.26s;
      }

      @keyframes pv-pulse {
        0%,
        70%,
        100% {
          opacity: 0.25;
          transform: translateY(0);
        }

        35% {
          opacity: 1;
          transform: translateY(-3px);
        }
      }

      .pv-composer {
        display: flex;
        align-items: center;
        min-height: 50px;
        margin: 9px 12px 0;
        border: 1px solid rgba(13, 27, 42, 0.16);
        border-radius: 3px;
        background: #FFFFFF;
        box-shadow: 0 5px 16px rgba(13, 27, 42, 0.04);
      }

      .pv-composer:focus-within {
        border-color: var(--pv-gold);
      }

      .pv-input {
        flex: 1;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        padding: 0 12px;
        color: var(--pv-navy);
        font: 400 12px/1.3 "Outfit", "Segoe UI", Arial, sans-serif;
      }

      .pv-input::placeholder {
        color: #92979C;
      }

      .pv-send {
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        width: 38px;
        height: 38px;
        margin-right: 5px;
        border: 0;
        border-radius: 2px;
        background: var(--pv-navy);
        color: var(--pv-gold-light);
        font-size: 18px;
        cursor: pointer;
      }

      .pv-send:disabled {
        opacity: 0.3;
        cursor: default;
      }

      .pv-privacy {
        margin: 7px 13px 10px;
        color: #8D9297;
        text-align: center;
        font: 400 8.5px/1.35 "Outfit", "Segoe UI", Arial, sans-serif;
      }

      .pv-screen-reader {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }

      @media (max-width: 520px) {
        .pv-launcher {
          right: 14px;
          bottom: 14px;
          padding-right: 13px;
        }

        .pv-launcher-label {
          font-size: 12px;
        }

        .pv-panel {
          inset: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100dvh;
          max-width: none;
          border: 0;
          border-radius: 0;
          transform: translateY(20px);
        }

        .pv-header {
          padding-top: max(14px, env(safe-area-inset-top));
          min-height: 76px;
        }

        .pv-conversation {
          padding: 17px 12px 7px;
        }

        .pv-actions {
          grid-template-columns: 1fr;
        }

        .pv-stack {
          max-width: calc(100% - 32px);
        }

        .pv-bubble {
          font-size: 12.5px;
        }

        .pv-composer {
          margin-inline: 10px;
        }

        .pv-privacy {
          padding-bottom: env(safe-area-inset-bottom);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
        }
      }

      @media print {
        .pv-launcher,
        .pv-panel {
          display: none !important;
        }
      }
    </style>

    <button
      class="pv-launcher"
      type="button"
      aria-label="Abrir o Assistente Privus"
      aria-expanded="false"
    >
      <img
        class="pv-mark"
        src="${CONFIG.symbolUrl}"
        alt=""
        aria-hidden="true"
      >

      <span class="pv-launcher-label">
        Assistente Privus
      </span>

      <span
        class="pv-unread"
        aria-hidden="true"
      ></span>
    </button>

    <section
      class="pv-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="pv-assistant-title"
      aria-hidden="true"
    >
      <header class="pv-header">
        <div class="pv-identity">
          <img
            class="pv-seal"
            src="${CONFIG.symbolUrl}"
            alt="Símbolo Privus"
          >

          <div>
            <h2
              class="pv-title"
              id="pv-assistant-title"
            >
              Assistente Privus
            </h2>

            <p class="pv-status">
              <span class="pv-status-dot"></span>
              Orientação institucional
            </p>
          </div>
        </div>

        <div class="pv-header-actions">
          <button
            class="pv-restart"
            type="button"
            aria-label="Recomeçar conversa"
            title="Recomeçar"
          >
            ↻
          </button>

          <button
            class="pv-close"
            type="button"
            aria-label="Fechar assistente"
          >
            ×
          </button>
        </div>
      </header>

      <div class="pv-disclaimer">
        Informação geral · Não constitui consulta, auditoria ou parecer jurídico
      </div>

      <div
        class="pv-conversation"
        aria-live="polite"
        aria-relevant="additions"
      ></div>

      <form class="pv-composer">
        <label
          class="pv-screen-reader"
          for="pv-input"
        >
          Escreva a sua questão
        </label>

        <input
          class="pv-input"
          id="pv-input"
          type="text"
          maxlength="300"
          autocomplete="off"
          placeholder="Escreva a sua questão…"
        >

        <button
          class="pv-send"
          type="submit"
          aria-label="Enviar mensagem"
          disabled
        >
          ↑
        </button>
      </form>

      <p class="pv-privacy">
        Não introduza dados pessoais, confidenciais ou informação de clientes.
        A conversa não é enviada nem guardada.
      </p>
    </section>
  `;

  const launcher = root.querySelector(".pv-launcher");
  const panel = root.querySelector(".pv-panel");
  const closeButton = root.querySelector(".pv-close");
  const restartButton = root.querySelector(".pv-restart");
  const conversation = root.querySelector(".pv-conversation");
  const form = root.querySelector(".pv-composer");
  const input = root.querySelector(".pv-input");
  const sendButton = root.querySelector(".pv-send");
  const unread = root.querySelector(".pv-unread");

  let isOpen = false;
  let typing = false;
  let responseTimer = null;

  function createMiniSeal() {
    const seal = document.createElement("img");

    seal.className = "pv-mini";
    seal.src = CONFIG.symbolUrl;
    seal.alt = "";
    seal.setAttribute("aria-hidden", "true");

    return seal;
  }

  function scrollToEnd() {
    requestAnimationFrame(function () {
      conversation.scrollTop =
        conversation.scrollHeight;
    });
  }

  function addMessage(role, text, actions) {
    const row = document.createElement("article");

    row.className =
      "pv-row" +
      (role === "user" ? " is-user" : "");

    if (role === "assistant") {
      row.appendChild(createMiniSeal());
    }

    const stack = document.createElement("div");
    stack.className = "pv-stack";

    const bubble = document.createElement("div");
    bubble.className = "pv-bubble";
    bubble.textContent = text;

    stack.appendChild(bubble);

    if (Array.isArray(actions) && actions.length) {
      const actionsWrap =
        document.createElement("div");

      actionsWrap.className = "pv-actions";

      actions.forEach(function (action) {
        const button =
          document.createElement("button");

        button.type = "button";

        button.className =
          "pv-action" +
          (action.primary ? " is-primary" : "");

        button.textContent = action.label;

        button.addEventListener(
          "click",
          function () {
            chooseAction(action);
          }
        );

        actionsWrap.appendChild(button);
      });

      stack.appendChild(actionsWrap);
    }

    row.appendChild(stack);
    conversation.appendChild(row);

    scrollToEnd();
  }

  function showTyping() {
    const row =
      document.createElement("article");

    row.className =
      "pv-row pv-typing-row";

    row.appendChild(createMiniSeal());

    const indicator =
      document.createElement("div");

    indicator.className = "pv-typing";

    indicator.setAttribute(
      "aria-label",
      "O Assistente Privus está a responder"
    );

    indicator.innerHTML =
      "<span></span><span></span><span></span>";

    row.appendChild(indicator);
    conversation.appendChild(row);

    scrollToEnd();
  }

  function answer(key) {
    if (typing) return;

    typing = true;

    showTyping();

    responseTimer =
      window.setTimeout(function () {
        const typingRow =
          conversation.querySelector(
            ".pv-typing-row"
          );

        if (typingRow) {
          typingRow.remove();
        }

        const response =
          RESPONSES[key] ||
          RESPONSES.fallback;

        addMessage(
          "assistant",
          response.text,
          response.actions
        );

        typing = false;
        responseTimer = null;

        if (!isOpen) {
          unread.classList.add(
            "is-visible"
          );
        }
      }, 430);
  }

  function openExternal(url) {
    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function chooseAction(action) {
    if (action.value === "open-pria") {
      window.location.href =
        CONFIG.priaUrl;

      return;
    }

    if (action.value === "open-booking") {
      window.location.href =
        CONFIG.bookingUrl;

      return;
    }

    if (action.value === "open-whatsapp") {
      openExternal(
        CONFIG.whatsappUrl
      );

      return;
    }

    if (action.value === "open-email") {
      window.location.href =
        "mailto:" +
        CONFIG.email +
        "?subject=" +
        encodeURIComponent(
          "Contacto através do Assistente Privus"
        );

      return;
    }

    addMessage(
      "user",
      action.label
    );

    answer(
      action.value
    );
  }

  function setOpen(next) {
    isOpen = next;

    panel.classList.toggle(
      "is-open",
      isOpen
    );

    panel.setAttribute(
      "aria-hidden",
      String(!isOpen)
    );

    launcher.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

    launcher.setAttribute(
      "aria-label",
      isOpen
        ? "Fechar o Assistente Privus"
        : "Abrir o Assistente Privus"
    );

    unread.classList.remove(
      "is-visible"
    );

    if (isOpen) {
      window.setTimeout(function () {
        input.focus();
      }, 180);
    } else {
      launcher.focus();
    }
  }

  function restart() {
    if (responseTimer) {
      window.clearTimeout(
        responseTimer
      );
    }

    responseTimer = null;
    typing = false;

    conversation.textContent = "";
    input.value = "";
    sendButton.disabled = true;

    addMessage(
      "assistant",
      INITIAL.text,
      INITIAL.actions
    );

    input.focus();
  }

  launcher.addEventListener(
    "click",
    function () {
      setOpen(!isOpen);
    }
  );

  closeButton.addEventListener(
    "click",
    function () {
      setOpen(false);
    }
  );

  restartButton.addEventListener(
    "click",
    restart
  );

  input.addEventListener(
    "input",
    function () {
      sendButton.disabled =
        !input.value.trim() ||
        typing;
    }
  );

  form.addEventListener(
    "submit",
    function (event) {
      event.preventDefault();

      const value =
        input.value.trim();

      if (!value || typing) return;

      addMessage(
        "user",
        value
      );

      input.value = "";
      sendButton.disabled = true;

      answer(
        matchIntent(value)
      );
    }
  );

  document.addEventListener(
    "keydown",
    function (event) {
      if (
        event.key === "Escape" &&
        isOpen
      ) {
        setOpen(false);
      }
    }
  );

  addMessage(
    "assistant",
    INITIAL.text,
    INITIAL.actions
  );
})();
