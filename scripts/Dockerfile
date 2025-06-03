FROM ubuntu:latest

RUN apt-get update
RUN apt-get -y install wget unzip
RUN mkdir /opt/schedulator
COPY ./scripts/download_run.sh /opt/schedulator
COPY ./scripts/default_config.json /opt/schedulator/config.json
CMD ["/opt/schedulator/download_run.sh"]