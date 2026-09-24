const balanceValue = document.querySelector("#balance-value");
const accountBalance = document.querySelector("#account-balance");
const balanceStatus = document.querySelector("#balance-status");
const refreshButton = document.querySelector("#refresh-balance");

const sendModal = document.querySelector("#send-modal");
const openSendButton = document.querySelector("#open-send");
const closeSendButton = document.querySelector("#close-send");

const transferForm = document.querySelector("#transfer-form");
const transferAmount = document.querySelector("#transfer-amount");
const transferResult = document.querySelector("#transfer-result");

const authorizeButton = document.querySelector("#authorize-card");
const cardResult = document.querySelector("#card-result");

function minorUnitsToDisplay(value) {
  return (Number(value) / 100).toFixed(2);
}

function displayToMinorUnits(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid positive amount.");
  }

  return Math.round(amount * 100);
}

function showResult(element, message, type = "") {
  element.textContent = message;
  element.className = `result ${type}`;
}

function openSendModal() {
  sendModal.classList.add("open");
  transferAmount.focus();
}

function closeSendModal() {
  sendModal.classList.remove("open");
}

openSendButton.addEventListener("click", openSendModal);
closeSendButton.addEventListener("click", closeSendModal);

sendModal.addEventListener("click", (event) => {
  if (event.target === sendModal) {
    closeSendModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSendModal();
  }
});

async function loadBalance() {
  balanceStatus.textContent = "Loading…";

  try {
    const response = await fetch("/api/balance/business-a");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Could not load balance.");
    }

    const displayBalance = minorUnitsToDisplay(
      data.blockchain.encrypted,
    );

    balanceValue.textContent = displayBalance;
    accountBalance.textContent = displayBalance;

    balanceStatus.textContent =
      data.blockchain.source === "real"
        ? "Live · Base Sepolia"
        : "Mock balance";
  } catch (error) {
    balanceValue.textContent = "—";
    accountBalance.textContent = "—";

    balanceStatus.textContent =
      error instanceof Error ? error.message : "Unavailable";
  }
}

refreshButton.addEventListener("click", loadBalance);

transferForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = transferForm.querySelector("button[type='submit']");
  button.disabled = true;

  showResult(
    transferResult,
    "Generating zero-knowledge proof and submitting…",
  );

  try {
    const amount = displayToMinorUnits(transferAmount.value);

    const response = await fetch("/api/transfers/encrypted", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Transfer failed.");
    }

    showResult(
      transferResult,
      `Confirmed · ${data.transactionHash}`,
      "success",
    );

    await loadBalance();
  } catch (error) {
    showResult(
      transferResult,
      error instanceof Error ? error.message : "Transfer failed.",
      "error",
    );
  } finally {
    button.disabled = false;
  }
});

authorizeButton.addEventListener("click", async () => {
  authorizeButton.disabled = true;
  showResult(cardResult, "Authorizing 42.50…");

  try {
    const response = await fetch("/api/cards/authorize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authorizationId: `demo-auth-${Date.now()}`,
        accountId: "business-a",
        amount: 4250,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Authorization failed.");
    }

    const approved = data.decision === "APPROVED";

    showResult(
      cardResult,
      approved
        ? "Approved · 42.50 reserved"
        : `Declined · ${data.reason ?? "insufficient available funds"}`,
      approved ? "success" : "error",
    );
  } catch (error) {
    showResult(
      cardResult,
      error instanceof Error ? error.message : "Authorization failed.",
      "error",
    );
  } finally {
    authorizeButton.disabled = false;
  }
});

loadBalance();
