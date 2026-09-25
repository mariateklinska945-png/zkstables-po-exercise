/* --------------------------------
   NAVIGATION
-------------------------------- */

const pages = {
  overview: {
    title: "Overview",
    subtitle: "Your private business account",
  },
  accounts: {
    title: "Accounts",
    subtitle: "Manage your business money",
  },
  payments: {
    title: "Payments",
    subtitle: "Send and manage payments",
  },
  cards: {
    title: "Cards",
    subtitle: "Manage team spending",
  },
  activity: {
    title: "Activity",
    subtitle: "Account and payment activity",
  },
};

function navigateTo(pageName) {
  if (!pages[pageName]) return;

  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });

  document
    .getElementById(`page-${pageName}`)
    ?.classList.add("active");

  document
    .querySelector(`.nav-item[data-page="${pageName}"]`)
    ?.classList.add("active");

  document.getElementById("page-title").textContent =
    pages[pageName].title;

  document.getElementById("page-subtitle").textContent =
    pages[pageName].subtitle;

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    navigateTo(button.dataset.page);
  });
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.go;

    navigateTo(target);

    if (target === "accounts") {
      const action = button.dataset.accountAction;

      if (action === "add") {
        openAccountPanel("add");
      }

      if (action === "withdraw") {
        openAccountPanel("withdraw");
      }
    }
  });
});

/* --------------------------------
   ACCOUNT PANELS
-------------------------------- */

const addMoneyPanel =
  document.getElementById("add-money-panel");

const withdrawPanel =
  document.getElementById("withdraw-panel");

function closeAccountPanels() {
  addMoneyPanel?.classList.add("hidden");
  withdrawPanel?.classList.add("hidden");
}

function openAccountPanel(type) {
  closeAccountPanels();

  if (type === "add") {
    addMoneyPanel?.classList.remove("hidden");
    addMoneyPanel?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  if (type === "withdraw") {
    withdrawPanel?.classList.remove("hidden");
    withdrawPanel?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
}

document
  .getElementById("add-money-button")
  ?.addEventListener("click", () => {
    openAccountPanel("add");
  });

document
  .getElementById("open-withdraw")
  ?.addEventListener("click", () => {
    openAccountPanel("withdraw");
  });

document
  .querySelectorAll("[data-close-panel]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      closeAccountPanels();
    });
  });

/* --------------------------------
   MONEY HELPERS
-------------------------------- */

function formatMoney(minorUnits) {
  const value = Number(minorUnits) / 100;

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toMinorUnits(value) {
  const normalized = String(value).trim();

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(
      "Enter an amount with no more than 2 decimal places.",
    );
  }

  const [whole, fraction = ""] = normalized.split(".");

  return (
    Number(whole) * 100 +
    Number(fraction.padEnd(2, "0"))
  );
}

/* --------------------------------
   BALANCE
-------------------------------- */

async function loadBalance() {
  try {
    const response = await fetch(
      "/api/balance/business-a",
    );

    if (!response.ok) {
      throw new Error(
        `Balance request failed: ${response.status}`,
      );
    }

    const data = await response.json();

    const encryptedMinorUnits =
      data.blockchain.encrypted;

    const formatted =
      formatMoney(encryptedMinorUnits);

    const overviewBalance =
      document.getElementById("overview-balance");

    const overviewAccountBalance =
      document.getElementById(
        "overview-account-balance",
      );

    const accountsBalance =
      document.getElementById("accounts-balance");

    const paymentBalance =
      document.getElementById("payment-balance");

    if (overviewBalance) {
      overviewBalance.textContent = formatted;
    }

    if (overviewAccountBalance) {
      overviewAccountBalance.textContent =
        `${formatted} zkUSD`;
    }

    if (accountsBalance) {
      accountsBalance.textContent = formatted;
    }

    if (paymentBalance) {
      paymentBalance.textContent =
        `${formatted} zkUSD`;
    }
  } catch (error) {
    console.error(
      "Could not load balance:",
      error,
    );
  }
}

/* --------------------------------
   PRIVATE TRANSFER
-------------------------------- */

const sendForm =
  document.getElementById("send-form");

const sendButton =
  document.getElementById("send-button");

const sendResult =
  document.getElementById("send-result");

sendForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const amountInput =
    document.getElementById("send-amount");

  try {
    const amount =
      toMinorUnits(amountInput.value);

    sendButton.disabled = true;
    sendButton.textContent = "Sending…";

    showResult(
      sendResult,
      "Generating proof and submitting encrypted transfer…",
      "",
    );

    const response = await fetch(
      "/api/transfers/encrypted",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Encrypted transfer failed.",
      );
    }

    const transactionHash =
      getTransactionHash(data);

    showResult(
      sendResult,
      transactionHash
        ? `Transfer completed.\nTransaction: ${transactionHash}`
        : "Transfer completed successfully.",
      "success",
    );

    await loadBalance();
  } catch (error) {
    showResult(
      sendResult,
      error instanceof Error
        ? error.message
        : "Encrypted transfer failed.",
      "error",
    );
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Review & send";
  }
});

/* --------------------------------
   PUBLIC EVM WITHDRAWAL
-------------------------------- */

const withdrawForm =
  document.getElementById("withdraw-form");

const withdrawButton =
  document.getElementById("withdraw-button");

const withdrawResult =
  document.getElementById("withdraw-result");

withdrawForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const recipient =
      document
        .getElementById("withdraw-address")
        .value
        .trim();

    const amountInput =
      document.getElementById("withdraw-amount");

    try {
      if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
        throw new Error(
          "Enter a valid EVM address starting with 0x.",
        );
      }

      const amount =
        toMinorUnits(amountInput.value);

      /*
       * Important:
       * This is a REAL Base Sepolia operation when
       * BLOCKCHAIN_MODE=real.
       */
      const confirmed = window.confirm(
        `Withdraw ${amountInput.value} zkUSD to:\n\n${recipient}\n\n` +
        "This will submit a real Base Sepolia transaction and " +
        "move funds from the encrypted balance to a public EVM address.\n\n" +
        "Continue?",
      );

      if (!confirmed) {
        return;
      }

      withdrawButton.disabled = true;
      withdrawButton.textContent =
        "Withdrawing…";

      showResult(
        withdrawResult,
        "Generating proof and submitting withdrawal…",
        "",
      );

      const response = await fetch(
        "/api/transfers/to-evm",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            recipient,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Withdrawal failed.",
        );
      }

      const transactionHash =
        getTransactionHash(data);

      showResult(
        withdrawResult,
        transactionHash
          ? `Withdrawal completed.\nTransaction: ${transactionHash}`
          : "Withdrawal completed successfully.",
        "success",
      );

      await loadBalance();
    } catch (error) {
      showResult(
        withdrawResult,
        error instanceof Error
          ? error.message
          : "Withdrawal failed.",
        "error",
      );
    } finally {
      withdrawButton.disabled = false;
      withdrawButton.textContent =
        "Review withdrawal";
    }
  },
);

/* --------------------------------
   CARD AUTHORIZATION
-------------------------------- */

const authorizeCardButton =
  document.getElementById("authorize-card");

const cardResult =
  document.getElementById("card-result");

authorizeCardButton?.addEventListener(
  "click",
  async () => {
    authorizeCardButton.disabled = true;
    authorizeCardButton.textContent =
      "Authorizing…";

    showResult(
      cardResult,
      "Checking available funds…",
      "",
    );

    try {
      const authorizationId =
        `demo-auth-${Date.now()}`;

      const response = await fetch(
        "/api/cards/authorize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            authorizationId,
            accountId: "business-a",
            amount: 4250,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Card authorization failed.",
        );
      }

      if (data.decision === "APPROVED") {
        showResult(
          cardResult,
          "Approved · 42.50 reserved",
          "success",
        );
      } else {
        showResult(
          cardResult,
          "Declined · no funds reserved",
          "error",
        );
      }
    } catch (error) {
      showResult(
        cardResult,
        error instanceof Error
          ? error.message
          : "Card authorization failed.",
        "error",
      );
    } finally {
      authorizeCardButton.disabled = false;
      authorizeCardButton.textContent =
        "Authorize 42.50";
    }
  },
);

/* --------------------------------
   RESPONSE HELPERS
-------------------------------- */

function getTransactionHash(data) {
  return (
    data?.transactionHash ??
    data?.txHash ??
    data?.hash ??
    data?.transaction?.hash ??
    data?.tx?.transactionHash ??
    null
  );
}

function showResult(element, message, type) {
  if (!element) return;

  element.classList.remove(
    "hidden",
    "success",
    "error",
  );

  if (type) {
    element.classList.add(type);
  }

  element.textContent = message;
}

/* --------------------------------
   START
-------------------------------- */

navigateTo("overview");
loadBalance();
