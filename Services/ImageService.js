const azure = require("azure-storage");
const stream = require("stream");
const fs = require("fs");
const Readable = stream.Readable;

const blobService = azure.createBlobServiceWithSas(
	"https://msquiz.blob.core.windows.net",
	"sp=rw&st=2023-02-12T06:38:43Z&se=2024-06-30T14:38:43Z&sv=2021-06-08&sr=c&sig=y1ayNF%2BdtZ57n2mxlq%2FBjdXHHS6wP2XacV3McFqtU80%3D"
);
const containerName = "image";

function bufferToStream(buffer) {
	var stream = new Readable();
	stream.push(buffer);
	stream.push(null);
	return stream;
}

exports.uploadImage = async function (file, cb) {
	const blobName = file.originalname;
	let response = await blobService.createAppendBlobFromStream(
		containerName,
		blobName,
		bufferToStream(file.buffer),
		file.size,
		cb
	);
	return response;
};

exports.getImageUrl = function (req, res) {
	return res.send(
		"https://msquiz.blob.core.windows.net/image/" +
			req.params.imageid +
			"?sp=rw&st=2023-02-12T06:38:43Z&se=2024-06-30T14:38:43Z&sv=2021-06-08&sr=c&sig=y1ayNF%2BdtZ57n2mxlq%2FBjdXHHS6wP2XacV3McFqtU80%3D"
	);
};
