const setText = (selector: string, value: string) => {
  document.querySelector(selector).innerHTML = value;
};

export { setText };
