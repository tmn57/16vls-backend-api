
module.exports = {
  cryptoExchange: `
<html>
<head>
	<meta charset="utf-8">
	<title>CryptoJS Exchange</title>
	<meta name="description" content="CryptoJs Exchange">
	<meta name="author" content="Nguyễn Xuân Nghiêm">
	<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/aes.js">
	</script>

<body>
<h1>CryptoJS.AES</h1>
<div>
  password: <b>16vls-s3cr3t-password</b> (CryptoJS.AES.decrypt/decrypt)</br>
  phone-code: <b>16vls-s3cr3t-phone-code</b> (CryptoJS.AES.decrypt/decrypt)</br></br>
  </div>
<div>
	  <input id="string1" placeholder="plain-text">
    </input>
      <input id="key1" placeholder="secret-key">
      </input>
      <button onclick="encrypt()">
        encrypt
      </button>
      <div>
      <label>result:</label>
      <h5 id="res1"></h5>
      </div>
    </div>
    <div>
      <input id="string2" placeholder="encrypt-text">
      </input>
      <input id="key2" placeholder="secret-key">
      </input>
      <button onclick="decrypt()">
        decrypt
      </button>
      <div>
        <label>result:</label>
        <h5 id="res2"></h5>
      </div>
    </div>
    <script>
      const encrypt = () => {
        const plain_text = document.getElementById("string1").value
        const key = document.getElementById("key1").value
        const res = CryptoJS.AES.encrypt(plain_text, key).toString()
        document.getElementById("res1").innerHTML = res
        document.getElementById("string2").value = res
      }
    const decrypt = () => {
      const plain_text = document.getElementById("string2").value
      const key = document.getElementById("key2").value
      document.getElementById("res2").innerHTML = CryptoJS.AES.decrypt(plain_text, key).toString(
        CryptoJS.enc.Utf8
        )
      }
    </script>
  </body>
</html>
  `
}
