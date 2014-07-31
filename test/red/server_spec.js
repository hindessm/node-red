/**
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
var should = require("should");
var sinon = require('sinon');
var request = require('supertest');
var http = require('http');
var express = require('express');

var util = require('util');
var fs = require('fs-extra');
var path = require('path');
var when = require('when');

var app = express();
var RED = require("../../red/red.js");
var server = require("../../red/server.js");
var nodes = require("../../red/nodes");

describe("library", function() {
    var userDir = path.join(__dirname,".testUserHome");
    before(function(done) {
        fs.remove(userDir,function(err) {
            fs.mkdir(userDir,function() {
                sinon.stub(nodes, 'load', function() {
                    return when.promise(function(resolve,reject){
                        resolve([]);
                    });
                });
                RED.init(http.createServer(function(req,res){app(req,res)}),
                         {userDir: userDir});
                server.start().then(function () { done(); });
            });
        });
    });

    after(function(done) {
        fs.remove(userDir,done);
        server.stop();
        nodes.load.restore();
    });

    afterEach(function(done) {
        fs.remove(userDir,function(err) {
            fs.mkdir(userDir,done);
        });
    });

    it('empty node configuration', function(done) {
        request(RED.httpAdmin)
            .get('/nodes')
            .expect(200)
            .end(function(err,res) {
                if (err) {
                    throw err;
                    }
                res.text.should.equal('<script type="text/javascript"></script>');
                done();
            });
    });

    it('empty list of flows', function(done) {
        request(RED.httpAdmin)
            .get('/flows')
            .expect(200)
            .end(function(err,res) {
                if (err) {
                    throw err;
                }
                res.body.should.eql([]);
                done();
            });
    });

    it('can update and read flows', function(done) {
        var flow = [{"id":"n1","type":"test"}];
        request(RED.httpAdmin)
            .post('/flows')
            .set('Content-Type', 'application/json; charset=UTF-8')
            .send(JSON.stringify(flow))
            .expect(204).end(function (err, res) {
                if (err) {
                    throw err;
                }
                request(RED.httpAdmin)
                    .get('/flows')
                    .expect(200)
                    .end(function(err,res) {
                        if (err) {
                            throw err;
                        }
                        res.body.should.eql(flow);
                        done();
                    });
            });
    });

    describe("start", function() {
        it("handles node loading errors", function (done) {
            server.stop();
            nodes.load.restore();
            sinon.stub(nodes, 'load', function() {
                return when.promise(function(resolve,reject){
                    resolve(['node load failed']);
                });
            });
            var log = '';
            sinon.stub(util, 'log', function(message) {
                log += message + "\n";
            });
            server.start().then(function () {
                log.should.containEql('Failed to register 1 node type');
                server.stop();
                util.log.restore();
                done();
            });
        });
    });

});
