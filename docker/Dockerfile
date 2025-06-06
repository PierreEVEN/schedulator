#!Dockerfile

FROM ubuntu:latest

ARG VERSION=latest
ENV schedulator_VERSION=${VERSION}

RUN apt-get update
RUN apt-get -y install wget unzip
RUN mkdir /opt/schedulator
COPY ./download_run.sh /opt/schedulator/
COPY ./config.json /opt/schedulator/
RUN chmod u+x /opt/schedulator/download_run.sh
CMD /opt/schedulator/download_run.sh ${schedulator_VERSION} ${VERSION}