#!Dockerfile

FROM ubuntu:latest

ARG VERSION=latest

RUN apt-get update
RUN apt-get -y install wget unzip dos2unix
RUN mkdir /opt/schedulator
RUN mkdir /opt/schedulator/migrations

COPY scripts/config.json /opt/schedulator/
COPY scripts/download_run.sh /opt/schedulator/

RUN chmod u+x /opt/schedulator/download_run.sh
RUN dos2unix /opt/schedulator/download_run.sh

CMD /opt/schedulator/download_run.sh ${VERSION}