import {config} from 'dotenv';
config();

import express from "express";
import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch'
import request from 'request';
import { arrayBufferToBase64 } from './util.js';
import cors from "cors";
import fileUpload from 'express-fileupload';

const app = express();
app.use(express.json());    //enable parsing middleware for requests
app.use(express.urlencoded());
app.use(express.static("public"))
app.set("view engine","ejs");
app.use(cors({origin:['http://localhost:3000'],credentials:true}));
app.use(fileUpload());

const PORT = process.env.PORT || 8080;
var API_KEY="";

var provider;
var resolution;
var details;
var query;

app.post('/upscale', (req,res)=>{
  let items={};
  if(req.files === null){
    res.status(400).json({msg:"No file selected"});
  }
  const file = req.files.file;
  console.log(file);
  const form = new FormData()
  form.append('image_file', file.data, {
    filename: file.name,
    contentType: file.mimetype,
  });
form.append('target_width', 2048)
form.append('target_height', 2048)

fetch('https://clipdrop-api.co/image-upscaling/v1/upscale', {
  method: 'POST',
  headers: {
    'x-api-key': `${process.env.CLIP_API_KEY}`,
  },
  body: form,
})
  .then(response => response.arrayBuffer())
  .then(buffer => {
    items = {image_resource_url:""};
    items.image_resource_url = 'data:image/png;base64,' + arrayBufferToBase64(buffer);
    res.json(items)
  })
})

app.post("/", async (req,res)=>{
    let items={};
    details = `${req.body.lighting}${req.body.artstyle}${req.body.time}${req.body.color}${req.body.frame}${req.body.inspiration}`
    query = req.body.prompt + details;
  //console.log(query)
    provider = req.body.provider;
    resolution = req.body.resolution;
    console.log(query+"\n"+provider+"\n"+resolution)
    if(["openai","deepai","stabilityai","replicate"].includes(provider)){
    API_KEY = process.env.EDEN_API_KEY;
    const options = {
        method: "POST",
        url: "https://api.edenai.run/v2/image/generation",
        headers: {
          authorization: `Bearer ${API_KEY}`,
        },
        data: {
          providers: provider,
          text: query,
          resolution: resolution,
        },
      };
      
      axios
        .request(options)
        .then((response) => {
            var resp = (response.data);
            console.log({provider})
            console.log(resp[provider])
            // console.log(JSON.stringify(response.data))
            // 
            items = resp[provider].items[0];
            res.json(items)
        })
        .catch((error) => {
          console.error(error);
        });
        
    }
    else if(provider == "clipdropai"){
        API_KEY = process.env.CLIP_API_KEY;
        const form = new FormData()
        form.append('prompt',query )
        fetch('https://clipdrop-api.co/text-to-image/v1', {
        method: 'POST',
        headers: {
            'x-api-key': API_KEY,
        },
        body: form,
    })
  .then(response => response.arrayBuffer())
  .then(buffer => {
    items = {image_resource_url:""};
    items.image_resource_url = 'data:image/png;base64,' + arrayBufferToBase64(buffer);
    res.json(items)
  })
    .catch((error) => {
        console.error(error);
      });
}
    else if(provider == "stablediffusion"){
        API_KEY = process.env.STABLE_API_KEY;
        var options = {
            'method': 'POST',
            'url': 'https://stablediffusionapi.com/api/v3/text2img',
            'headers': {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              "key": API_KEY,
              "prompt": query,
              "negative_prompt": null,
              "width": resolution.slice(0,resolution.indexOf("x")),
              "height": resolution.slice(resolution.indexOf("x")+1),
              "samples": "1",
              "num_inference_steps": "20",
              "seed": null,
              "guidance_scale": 7.5,
              "safety_checker": "yes",
              "multi_lingual": "no",
              "panorama": "no",
              "self_attention": "no",
              "upscale": "no",
              "embeddings_model": null,
              "webhook": null,
              "track_id": null
            })
          };
          
          request(options, function (error, response) {
            if (error) {console.log(error)};
            var resp = (response.body);
            resp = JSON.parse(resp)
            items = {image_resource_url:""}
            items.image_resource_url =(resp.output[0])
            res.json(items)
          })
    }
});

//app.get("/img",(req,res)=>{
  //console.log(query)
  //  res.render("res",{items:items})
//})
// app.get("/error",(req,res)=>{
//     res.render("error");
// })
app.listen(PORT,()=>{
    console.log(`Server started on port ${PORT}`)
})