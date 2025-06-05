#!Dockerfile

FROM ubuntu:latest

ARG VERSION=latest

RUN apt-get update
RUN apt-get -y install wget unzip
RUN mkdir /opt/schedulator
COPY ./download_run.sh /opt/schedulator/
COPY ./config.json /opt/schedulator/
CMD ["/opt/schedulator/download_run.sh"] ${VERSION}