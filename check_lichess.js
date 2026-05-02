async function check() {
  const res = await fetch("https://lichess1.org/assets/piece/cburnett/wP.svg");
  console.log(res.status);
}
check();
