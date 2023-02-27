const uploadImage = require("./ImageService").uploadImage;

const sql = require("mssql");

const config = {
	user: "anuljain04",
	password: "Suhani_31",
	server: "msquizsql.database.windows.net",
	database: "question",
	options: {
		encrypt: true,
	},
};

exports.insertData = async function (req, res) {
	try {
		let data = req.body;
		var conn = new sql.ConnectionPool(config);
		var pool = await conn.connect();
		let id = null;

		function myCallback(error, blob) {
			if (error) {
				console.error(error);
			} else {
				console.log(blob);
				let request = new sql.Request(pool);
				const result = pool
					.request()
					.input("id", sql.Int, id)
					.input("imageurl", sql.VarChar(sql.MAX), blob.name)
					.query("UPDATE question SET imageurl = @imageurl WHERE id = @id");
				console.log(result);
				sql.close();
				return res.send("Successfully uploaded file to server");
			}
		}
		const request = new sql.Request(pool);
		request.input("title", sql.VarChar(sql.MAX), data.title);
		request.input("description", sql.VarChar(sql.MAX), data.description);
		request.input("imageurl", sql.VarChar(sql.MAX), data.imageurl);
		request.input("date_created", sql.DateTime, new Date());
		request.input("answer", sql.VarChar(sql.MAX), data.answer);
		request.input("status", sql.Int, 1);
		let response = request.query(
			`
            insert into question (title, description, answer, imageurl, status, date_created)
            OUTPUT inserted.id
            values (@title, @description, @answer, @imageurl, @status, @date_created)
        `,
			(err, result) => {
				console.log(result);
				id = result.recordset[0].id;
				if (req.files && req.files.length > 0) {
					uploadImage(req.files[0], myCallback);
				} else {
					res.send("Successfully uploaded file to server");
				}
			}
		);
	} catch (err) {
		console.error(err);
	} finally {
	}
};

exports.retrieveData = async () => {
	try {
		const pool = await sql.connect(config);
		const result = await pool.request().query(`SELECT TOP 5 * FROM question`);
		return result;
	} catch (err) {
		console.error(err);
	}
};

exports.getAnswer = async (id) => {
	try {
		const pool = await sql.connect(config);
		const result = await pool
			.request()
			.query(`SELECT answer FROM question where id=` + id);
		return result;
	} catch (err) {
		console.error(err);
	}
};
